import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AdminUsersController } from '../src/admin/admin-users.controller';
import { AdminUsersService } from '../src/admin/admin-users.service';

const createdAt = new Date('2026-09-10T12:00:00.000Z');

function user(overrides: Record<string, unknown> = {}) {
  return { id: 'user-1', name: 'Ana', email: 'ana@example.com', status: 'active', platformRole: 'USER', createdAt, ...overrides };
}

function admin() {
  return { id: 'admin-1', name: 'Admin', email: 'admin@example.com', platformRole: 'ADMIN', status: 'active' } as never;
}

function buildPrisma() {
  return {
    user: { count: jest.fn().mockResolvedValue(1), findMany: jest.fn().mockResolvedValue([user()]), findUnique: jest.fn().mockResolvedValue(user()) },
    goal: { count: jest.fn().mockResolvedValue(4) },
    team: { count: jest.fn().mockResolvedValue(2) },
    goalPhoto: { count: jest.fn().mockResolvedValue(3) },
    session: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
    $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({
      user: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      session: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
      adminAuditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    })),
  };
}

describe('gerenciamento administrativo de usuários', () => {
  it('lista somente dados operacionais seguros com filtros e paginação no servidor', async () => {
    const prisma = buildPrisma();
    prisma.user.count.mockResolvedValue(41);
    prisma.user.findMany.mockResolvedValue([user({ passwordHash: 'não deveria sair' })]);
    const service = new AdminUsersService(prisma as never, {} as never);

    await expect(service.list({ page: 2, pageSize: 20, search: '  Ana   Silva  ', status: 'disabled' })).resolves.toEqual({
      items: [{ id: 'user-1', name: 'Ana', email: 'ana@example.com', status: 'active', platformRole: 'USER', createdAt }],
      pagination: { page: 2, pageSize: 20, totalItems: 41, totalPages: 3 },
    });
    expect(prisma.user.count).toHaveBeenCalledWith({ where: { status: 'disabled', OR: [{ name: { contains: 'Ana Silva' } }, { email: { contains: 'Ana Silva' } }] } });
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 20, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, email: true, status: true, platformRole: true, createdAt: true } }));
    expect(Object.keys(prisma.user.findMany.mock.calls[0][0].select)).not.toEqual(expect.arrayContaining(['passwordHash', 'phone', 'birthDate']));
  });

  it('normaliza página fora do intervalo e preserva totalPages zero', async () => {
    const prisma = buildPrisma();
    prisma.user.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    const service = new AdminUsersService(prisma as never, {} as never);

    await expect(service.list({ page: 99, pageSize: 20 })).resolves.toEqual(expect.objectContaining({ pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } }));
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 20 }));
  });

  it('retorna detalhes com estatísticas agregadas sem conteúdo privado', async () => {
    const prisma = buildPrisma();
    const service = new AdminUsersService(prisma as never, {} as never);

    await expect(service.detail('user-1')).resolves.toEqual({ user: { id: 'user-1', name: 'Ana', email: 'ana@example.com', status: 'active', platformRole: 'USER', createdAt }, stats: { goalsCreated: 4, teams: 2, photos: 3 } });
    expect(prisma.goal.count).toHaveBeenCalledWith({ where: { ownerUserId: 'user-1' } });
    expect(prisma.team.count).toHaveBeenCalledWith({ where: { OR: [{ ownerUserId: 'user-1' }, { members: { some: { userId: 'user-1' } } }] } });
    expect(prisma.goalPhoto.count).toHaveBeenCalledWith({ where: { authorUserId: 'user-1' } });
  });

  it('revoga sessões e audita uma desativação de usuário comum', async () => {
    const prisma = buildPrisma();
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new AdminUsersService(prisma as never, audit as never);

    await expect(service.updateStatus(admin(), 'user-1', 'disabled')).resolves.toEqual({ user: expect.objectContaining({ id: 'user-1', status: 'disabled' }), changed: true });
    const transaction = prisma.$transaction.mock.calls[0][0];
    expect(typeof transaction).toBe('function');
    const tx = await (prisma.$transaction.mock.results[0].value as Promise<unknown>);
    expect(tx).toEqual(expect.objectContaining({ id: 'user-1', status: 'disabled' }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: 'admin-1', targetUserId: 'user-1', metadata: { previousStatus: 'active', nextStatus: 'disabled' } }), expect.any(Object));
  });

  it('não cria auditoria nem atualiza quando o estado já é o desejado', async () => {
    const prisma = buildPrisma();
    const audit = { record: jest.fn() };
    const service = new AdminUsersService(prisma as never, audit as never);

    await expect(service.updateStatus(admin(), 'user-1', 'active')).resolves.toEqual({ user: expect.objectContaining({ status: 'active' }), changed: false });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it.each([
    ['self', user({ id: 'admin-1', platformRole: 'ADMIN' }), 'admin-1', ForbiddenException],
    ['administrator target', user({ platformRole: 'ADMIN' }), 'user-1', ForbiddenException],
    ['missing target', null, 'missing', NotFoundException],
  ] as const)('rejeita %s sem expor operação indevida', async (_label, target, targetId, expected) => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(target);
    const service = new AdminUsersService(prisma as never, {} as never);

    await expect(Promise.resolve().then(() => service.updateStatus(admin(), targetId, 'disabled'))).rejects.toBeInstanceOf(expected);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('bloqueia usuário comum e administrador desabilitado no controller', async () => {
    const service = { list: jest.fn() };
    const controller = new AdminUsersController(service as never);
    await expect(Promise.resolve().then(() => controller.list({ user: { platformRole: 'USER', status: 'active' } } as never, {} as never))).rejects.toBeInstanceOf(ForbiddenException);
    await expect(Promise.resolve().then(() => controller.list({ user: { platformRole: 'ADMIN', status: 'disabled' } } as never, {} as never))).rejects.toBeInstanceOf(UnauthorizedException);
    expect(service.list).not.toHaveBeenCalled();
  });

  it('não revoga sessões ao reativar uma conta', async () => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(user({ status: 'disabled' }));
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new AdminUsersService(prisma as never, audit as never);

    await service.updateStatus(admin(), 'user-1', 'active');
    const tx = prisma.$transaction.mock.calls[0][0];
    expect(typeof tx).toBe('function');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'PLATFORM_USER_REACTIVATED' }), expect.any(Object));
  });
});
