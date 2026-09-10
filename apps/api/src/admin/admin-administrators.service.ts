import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuditService } from './admin-audit.service';
import {
  AdminAdministratorCandidateQueryDto,
  AdminUserStatus,
  ListAdminAdministratorsQueryDto,
} from './admin-users.dto';
import {
  adminUserSelect,
  AdminUserItem,
  normalizeSearch,
  toAdminUserItem,
} from './admin-users.service';
import { normalizePlatformRole, PLATFORM_AUDIT_ACTIONS, requireSuperAdmin } from './platform-role';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'] as const;
type ManagedAdminRole = (typeof ADMIN_ROLES)[number];

function isAdminRole(value: string): value is ManagedAdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(value);
}

function transitionAction(currentRole: ManagedAdminRole | 'USER', nextRole: ManagedAdminRole | 'USER') {
  if (currentRole === 'USER' && nextRole === 'ADMIN') return PLATFORM_AUDIT_ACTIONS.ADMIN_PROMOTED;
  if (currentRole === 'ADMIN' && nextRole === 'USER') return PLATFORM_AUDIT_ACTIONS.ADMIN_DEMOTED;
  if (currentRole === 'ADMIN' && nextRole === 'SUPER_ADMIN') return PLATFORM_AUDIT_ACTIONS.SUPER_ADMIN_PROMOTED;
  if (currentRole === 'SUPER_ADMIN' && nextRole === 'ADMIN') return PLATFORM_AUDIT_ACTIONS.SUPER_ADMIN_DEMOTED;
  return null;
}

function allowedTransition(currentRole: string, nextRole: string) {
  return (currentRole === 'USER' && nextRole === 'ADMIN')
    || (currentRole === 'ADMIN' && (nextRole === 'USER' || nextRole === 'SUPER_ADMIN'))
    || (currentRole === 'SUPER_ADMIN' && nextRole === 'ADMIN');
}

@Injectable()
export class AdminAdministratorsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AdminAuditService) {}

  async list(query: ListAdminAdministratorsQueryDto) {
    const requestedPage = Number.isInteger(query.page) ? query.page : 1;
    const pageSize = Number.isInteger(query.pageSize) ? Math.min(100, Math.max(1, query.pageSize)) : 20;
    const search = normalizeSearch(query.search);
    const where: Prisma.UserWhereInput = {
      platformRole: { in: [...ADMIN_ROLES] },
      ...(search ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] } : {}),
    };
    const totalItems = await this.prisma.user.count({ where });
    const totalPages = Math.ceil(totalItems / pageSize);
    const page = totalPages === 0 ? 1 : Math.min(requestedPage, totalPages);
    const items = await this.prisma.user.findMany({
      where,
      orderBy: [{ platformRole: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: adminUserSelect,
    });
    return { items: items.map(toAdminUserItem), pagination: { page, pageSize, totalItems, totalPages } };
  }

  async detail(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: adminUserSelect });
    if (!user || !isAdminRole(normalizePlatformRole(user.platformRole))) throw new NotFoundException('Administrador não encontrado.');
    return { user: toAdminUserItem(user) };
  }

  async candidates(query: AdminAdministratorCandidateQueryDto) {
    const search = normalizeSearch(query.search);
    if (!search || search.length < 2) return { items: [] as AdminUserItem[] };
    const items = await this.prisma.user.findMany({
      where: { platformRole: 'USER', status: 'active', OR: [{ name: { contains: search } }, { email: { contains: search } }] },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: adminUserSelect,
    });
    return { items: items.map(toAdminUserItem) };
  }

  async updateRole(actor: AuthUser, userId: string, nextRole: string) {
    requireSuperAdmin(actor);
    if (!isAdminRole(nextRole) && nextRole !== 'USER') throw new ConflictException('Papel de plataforma inválido.');
    if (actor.id === userId) throw new ForbiddenException('Não é permitido alterar o próprio papel de plataforma.');

    const target = await this.prisma.user.findUnique({ where: { id: userId }, select: adminUserSelect });
    if (!target) throw new NotFoundException('Administrador não encontrado.');
    const currentRole = normalizePlatformRole(target.platformRole);
    if (!allowedTransition(currentRole, nextRole)) throw new ConflictException('Essa transição de papel de plataforma não é permitida.');
    if (currentRole === 'USER' && target.status !== 'active') throw new ForbiddenException('Somente usuários ativos podem se tornar administradores.');
    const action = transitionAction(currentRole, nextRole);
    if (!action) throw new ConflictException('O papel de plataforma já possui o valor solicitado.');

    const result = await this.prisma.$transaction(async (tx) => {
      if (currentRole === 'SUPER_ADMIN' && nextRole === 'ADMIN') {
        const activeSuperAdmins = await tx.user.count({ where: { platformRole: 'SUPER_ADMIN', status: 'active' } });
        if (activeSuperAdmins <= 1) throw new ConflictException('A plataforma precisa manter pelo menos um superadministrador ativo.');
      }
      const updated = await tx.user.updateMany({ where: { id: userId, platformRole: currentRole, status: target.status }, data: { platformRole: nextRole } });
      if (updated.count !== 1) throw new ConflictException('O papel do administrador foi alterado. Atualize a lista e tente novamente.');
      await this.audit.record({ actorUserId: actor.id, action, targetUserId: userId, metadata: { previousRole: currentRole, newRole: nextRole } }, tx);
      return { ...target, platformRole: nextRole };
    });
    return { user: toAdminUserItem(result), changed: true };
  }

  async updateStatus(actor: AuthUser, userId: string, nextStatus: AdminUserStatus) {
    requireSuperAdmin(actor);
    if (actor.id === userId) throw new ForbiddenException('Não é permitido desativar a própria conta.');
    const target = await this.prisma.user.findUnique({ where: { id: userId }, select: adminUserSelect });
    if (!target || !isAdminRole(normalizePlatformRole(target.platformRole))) throw new NotFoundException('Administrador não encontrado.');
    if (target.status !== 'active' && target.status !== 'disabled') throw new ConflictException('O estado atual da conta não pode ser gerenciado.');
    if (target.status === nextStatus) return { user: toAdminUserItem(target), changed: false };
    const role = normalizePlatformRole(target.platformRole);
    const action = nextStatus === 'disabled' ? PLATFORM_AUDIT_ACTIONS.USER_DISABLED : PLATFORM_AUDIT_ACTIONS.USER_REACTIVATED;

    const result = await this.prisma.$transaction(async (tx) => {
      if (nextStatus === 'disabled' && role === 'SUPER_ADMIN') {
        const activeSuperAdmins = await tx.user.count({ where: { platformRole: 'SUPER_ADMIN', status: 'active' } });
        if (activeSuperAdmins <= 1) throw new ConflictException('A plataforma precisa manter pelo menos um superadministrador ativo.');
      }
      const updated = await tx.user.updateMany({ where: { id: userId, platformRole: role, status: target.status }, data: { status: nextStatus } });
      if (updated.count !== 1) throw new ConflictException('O estado do administrador foi alterado. Atualize a lista e tente novamente.');
      if (nextStatus === 'disabled') await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.audit.record({ actorUserId: actor.id, action, targetUserId: userId, metadata: { previousStatus: target.status, nextStatus, platformRole: role } }, tx);
      return { ...target, status: nextStatus };
    });
    return { user: toAdminUserItem(result), changed: true };
  }
}
