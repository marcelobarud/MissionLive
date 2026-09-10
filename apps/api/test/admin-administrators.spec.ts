import { ConflictException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AdminAdministratorsController } from '../src/admin/admin-administrators.controller';
import { AdminAdministratorsService } from '../src/admin/admin-administrators.service';

const createdAt = new Date('2026-09-10T12:00:00.000Z');

function adminUser(overrides: Record<string, unknown> = {}) {
  return { id: 'admin-1', name: 'Admin', email: 'admin@example.com', status: 'active', platformRole: 'ADMIN', createdAt, ...overrides };
}

function buildPrisma() {
  const tx = {
    user: { count: jest.fn().mockResolvedValue(2), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    session: { updateMany: jest.fn().mockResolvedValue({ count: 3 }) },
  };
  return {
    user: { count: jest.fn().mockResolvedValue(2), findMany: jest.fn().mockResolvedValue([adminUser({ platformRole: 'SUPER_ADMIN' }), adminUser()]), findUnique: jest.fn().mockResolvedValue(adminUser()) },
    $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    tx,
  };
}

const superAdmin = { id: 'super-1', email: 'super@example.com', name: 'Super', platformRole: 'SUPER_ADMIN', status: 'active' } as never;
const admin = { id: 'admin-actor', email: 'admin@example.com', name: 'Admin', platformRole: 'ADMIN', status: 'active' } as never;

describe('gerenciamento de administradores da plataforma', () => {
  it('lista somente administradores, inclui desativados e não expõe campos privados', async () => {
    const prisma = buildPrisma();
    prisma.user.findMany.mockResolvedValue([adminUser({ passwordHash: 'segredo', status: 'disabled', platformRole: 'SUPER_ADMIN' })]);
    const service = new AdminAdministratorsService(prisma as never, {} as never);

    await expect(service.list({ page: 2, pageSize: 20, search: '  Carla   Silva ' })).resolves.toEqual({
      items: [{ id: 'admin-1', name: 'Admin', email: 'admin@example.com', status: 'disabled', platformRole: 'SUPER_ADMIN', createdAt }],
      pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
    });
    expect(prisma.user.count).toHaveBeenCalledWith({ where: { platformRole: { in: ['ADMIN', 'SUPER_ADMIN'] }, OR: [{ name: { contains: 'Carla Silva' } }, { email: { contains: 'Carla Silva' } }] } });
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: [{ platformRole: 'desc' }, { createdAt: 'desc' }], select: { id: true, name: true, email: true, status: true, platformRole: true, createdAt: true } }));
    expect(Object.keys(prisma.user.findMany.mock.calls[0][0].select)).not.toEqual(expect.arrayContaining(['passwordHash', 'timezone', 'preferencesJson']));
  });

  it('busca candidatos somente entre usuários ativos e limita a dez resultados', async () => {
    const prisma = buildPrisma();
    prisma.user.findMany.mockResolvedValue([adminUser({ platformRole: 'USER' })]);
    const service = new AdminAdministratorsService(prisma as never, {} as never);

    await expect(service.candidates({ search: ' Ana ' })).resolves.toEqual({ items: [expect.objectContaining({ platformRole: 'USER' })] });
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { platformRole: 'USER', status: 'active', OR: [{ name: { contains: 'Ana' } }, { email: { contains: 'Ana' } }] }, take: 10 }));
  });

  it('não consulta candidatos com termo curto', async () => {
    const prisma = buildPrisma();
    const service = new AdminAdministratorsService(prisma as never, {} as never);
    await expect(service.candidates({ search: 'a' })).resolves.toEqual({ items: [] });
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it.each([
    ['USER', ForbiddenException],
    ['ADMIN', ForbiddenException],
    ['SUPER_ADMIN', null],
  ] as const)('aplica acesso de leitura de candidatos para %s', async (platformRole, expected) => {
    const service = { candidates: jest.fn().mockResolvedValue({ items: [] }) };
    const controller = new AdminAdministratorsController(service as never);
    const request = { user: { id: 'actor', platformRole, status: 'active' } };
    if (expected) await expect(Promise.resolve().then(() => controller.candidates(request as never, { search: 'An' }))).rejects.toBeInstanceOf(expected);
    else await expect(controller.candidates(request as never, { search: 'An' })).resolves.toEqual({ items: [] });
  });

  it('promove USER ativo a ADMIN e audita a transição na transação', async () => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(adminUser({ id: 'user-1', platformRole: 'USER' }));
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new AdminAdministratorsService(prisma as never, audit as never);

    await expect(service.updateRole(superAdmin, 'user-1', 'ADMIN')).resolves.toEqual({ user: expect.objectContaining({ id: 'user-1', platformRole: 'ADMIN' }), changed: true });
    expect(prisma.tx.user.updateMany).toHaveBeenCalledWith({ where: { id: 'user-1', platformRole: 'USER', status: 'active' }, data: { platformRole: 'ADMIN' } });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'PLATFORM_ADMIN_PROMOTED', metadata: { previousRole: 'USER', newRole: 'ADMIN' } }), expect.any(Object));
  });

  it('rejeita usuário desativado e transições não permitidas', async () => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(adminUser({ id: 'user-1', platformRole: 'USER', status: 'disabled' }));
    const service = new AdminAdministratorsService(prisma as never, {} as never);
    await expect(service.updateRole(superAdmin, 'user-1', 'ADMIN')).rejects.toBeInstanceOf(ForbiddenException);
    prisma.user.findUnique.mockResolvedValue(adminUser({ platformRole: 'ADMIN' }));
    await expect(service.updateRole(superAdmin, 'admin-1', 'ADMIN')).rejects.toBeInstanceOf(ConflictException);
  });

  it.each([
    ['ADMIN', 'USER', 'PLATFORM_ADMIN_DEMOTED'],
    ['ADMIN', 'SUPER_ADMIN', 'PLATFORM_SUPER_ADMIN_PROMOTED'],
    ['SUPER_ADMIN', 'ADMIN', 'PLATFORM_SUPER_ADMIN_DEMOTED'],
  ] as const)('aplica a transição %s para %s', async (currentRole, nextRole, action) => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(adminUser({ platformRole: currentRole }));
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new AdminAdministratorsService(prisma as never, audit as never);
    await expect(service.updateRole(superAdmin, 'admin-1', nextRole)).resolves.toMatchObject({ changed: true, user: { platformRole: nextRole } });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action }), expect.any(Object));
  });

  it('protege autoalteração e o último superadministrador ativo', async () => {
    const prisma = buildPrisma();
    const service = new AdminAdministratorsService(prisma as never, {} as never);
    await expect(service.updateRole(superAdmin, 'super-1', 'ADMIN')).rejects.toBeInstanceOf(ForbiddenException);
    prisma.user.findUnique.mockResolvedValue(adminUser({ id: 'super-2', platformRole: 'SUPER_ADMIN' }));
    prisma.tx.user.count.mockResolvedValue(1);
    await expect(service.updateRole(superAdmin, 'super-2', 'ADMIN')).rejects.toBeInstanceOf(ConflictException);
  });

  it('desativa administrador, revoga todas as sessões e audita o status', async () => {
    const prisma = buildPrisma();
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new AdminAdministratorsService(prisma as never, audit as never);
    await expect(service.updateStatus(superAdmin, 'admin-1', 'disabled')).resolves.toMatchObject({ changed: true, user: { status: 'disabled' } });
    expect(prisma.tx.session.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'admin-1', revokedAt: null } }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'PLATFORM_USER_DISABLED', metadata: { previousStatus: 'active', nextStatus: 'disabled', platformRole: 'ADMIN' } }), expect.any(Object));
  });

  it('não permite desativar o próprio usuário nem o último superadministrador', async () => {
    const prisma = buildPrisma();
    const service = new AdminAdministratorsService(prisma as never, {} as never);
    await expect(service.updateStatus(superAdmin, 'super-1', 'disabled')).rejects.toBeInstanceOf(ForbiddenException);
    prisma.user.findUnique.mockResolvedValue(adminUser({ platformRole: 'SUPER_ADMIN' }));
    prisma.tx.user.count.mockResolvedValue(1);
    await expect(service.updateStatus(superAdmin, 'admin-1', 'disabled')).rejects.toBeInstanceOf(ConflictException);
  });

  it('reativa sem restaurar sessões e não duplica auditoria em operação idempotente', async () => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(adminUser({ status: 'disabled', platformRole: 'SUPER_ADMIN' }));
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new AdminAdministratorsService(prisma as never, audit as never);
    await service.updateStatus(superAdmin, 'admin-1', 'active');
    expect(prisma.tx.session.updateMany).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'PLATFORM_USER_REACTIVATED' }), expect.any(Object));
    prisma.user.findUnique.mockResolvedValue(adminUser({ status: 'active' }));
    await expect(service.updateStatus(superAdmin, 'admin-1', 'active')).resolves.toMatchObject({ changed: false });
    expect(audit.record).toHaveBeenCalledTimes(1);
  });

  it('bloqueia mutations para ADMIN e não permite alvo inexistente', async () => {
    const prisma = buildPrisma();
    const service = new AdminAdministratorsService(prisma as never, {} as never);
    await expect(service.updateRole(admin, 'admin-1', 'USER')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.updateStatus(admin, 'admin-1', 'disabled')).rejects.toBeInstanceOf(ForbiddenException);
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.updateRole(superAdmin, 'missing', 'ADMIN')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.updateStatus(superAdmin, 'missing', 'disabled')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('mantém o endpoint de listagem disponível para ADMIN, mas candidatos e mutations exigem SUPER_ADMIN', async () => {
    const service = { list: jest.fn().mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } }) };
    const controller = new AdminAdministratorsController(service as never);
    await expect(controller.list({ user: admin } as never, {} as never)).resolves.toEqual(expect.objectContaining({ items: [] }));
    await expect(Promise.resolve().then(() => controller.candidates({ user: admin } as never, { search: 'An' }))).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.list).toHaveBeenCalledTimes(1);
  });

  it('bloqueia administrador desabilitado antes de consultar a lista', async () => {
    const service = { list: jest.fn() };
    const controller = new AdminAdministratorsController(service as never);
    await expect(Promise.resolve().then(() => controller.list({ user: { platformRole: 'ADMIN', status: 'disabled' } } as never, {} as never))).rejects.toBeInstanceOf(UnauthorizedException);
    expect(service.list).not.toHaveBeenCalled();
  });
});
