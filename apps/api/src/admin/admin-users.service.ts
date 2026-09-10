import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuditService } from './admin-audit.service';
import { AdminUserStatus, ListAdminUsersQueryDto } from './admin-users.dto';
import { normalizePlatformRole, PLATFORM_AUDIT_ACTIONS, requirePlatformAdmin } from './platform-role';

const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  status: true,
  platformRole: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

type AdminUserRecord = Prisma.UserGetPayload<{ select: typeof adminUserSelect }>;

export type AdminUserItem = {
  id: string;
  name: string;
  email: string;
  status: string;
  platformRole: ReturnType<typeof normalizePlatformRole>;
  createdAt: Date;
};

function normalizeSearch(value?: string) {
  return value?.trim().replace(/\s+/g, ' ') || undefined;
}

function toItem(user: AdminUserRecord): AdminUserItem {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
    platformRole: normalizePlatformRole(user.platformRole),
    createdAt: user.createdAt,
  };
}

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AdminAuditService) {}

  async list(query: ListAdminUsersQueryDto) {
    const requestedPage = Number.isInteger(query.page) ? query.page : 1;
    const pageSize = Number.isInteger(query.pageSize) ? Math.min(100, Math.max(1, query.pageSize)) : 20;
    const search = normalizeSearch(query.search);
    const where: Prisma.UserWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.platformRole ? { platformRole: query.platformRole } : {}),
      ...(search ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] } : {}),
    };
    const totalItems = await this.prisma.user.count({ where });
    const totalPages = Math.ceil(totalItems / pageSize);
    const page = totalPages === 0 ? 1 : Math.min(requestedPage, totalPages);
    const items = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: adminUserSelect,
    });
    return { items: items.map(toItem), pagination: { page, pageSize, totalItems, totalPages } };
  }

  async detail(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: adminUserSelect });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    const [goalsCreated, teams, photos] = await Promise.all([
      this.prisma.goal.count({ where: { ownerUserId: userId } }),
      this.prisma.team.count({ where: { OR: [{ ownerUserId: userId }, { members: { some: { userId } } }] } }),
      this.prisma.goalPhoto.count({ where: { authorUserId: userId } }),
    ]);
    return { user: toItem(user), stats: { goalsCreated, teams, photos } };
  }

  async updateStatus(actor: AuthUser, userId: string, nextStatus: AdminUserStatus) {
    requirePlatformAdmin(actor);
    if (actor.id === userId) throw new ForbiddenException('Não é permitido desativar a própria conta.');

    const target = await this.prisma.user.findUnique({ where: { id: userId }, select: adminUserSelect });
    if (!target) throw new NotFoundException('Usuário não encontrado.');
    if (normalizePlatformRole(target.platformRole) !== 'USER') throw new ForbiddenException('Administradores não podem ser gerenciados nesta operação.');
    if (target.status !== 'active' && target.status !== 'disabled') throw new ConflictException('O estado atual da conta não pode ser gerenciado.');
    if (target.status === nextStatus) return { user: toItem(target), changed: false };

    const action = nextStatus === 'disabled' ? PLATFORM_AUDIT_ACTIONS.USER_DISABLED : PLATFORM_AUDIT_ACTIONS.USER_REACTIVATED;
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({ where: { id: userId, status: target.status, platformRole: 'USER' }, data: { status: nextStatus } });
      if (updated.count !== 1) throw new ConflictException('O estado do usuário foi alterado. Atualize a lista e tente novamente.');
      if (nextStatus === 'disabled') await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.audit.record({ actorUserId: actor.id, action, targetUserId: userId, metadata: { previousStatus: target.status, nextStatus } }, tx);
      return { ...target, status: nextStatus };
    });
    return { user: toItem(result), changed: true };
  }
}
