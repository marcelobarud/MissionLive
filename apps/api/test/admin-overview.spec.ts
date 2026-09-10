import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AdminOverviewController } from '../src/admin/admin-overview.controller';
import { AdminOverviewService } from '../src/admin/admin-overview.service';

describe('painel administrativo da plataforma', () => {
  function buildPrisma() {
    const prisma = {
      user: {
        count: jest.fn((args?: { where?: { status?: string; createdAt?: { gte: Date; lt: Date } } }) => {
          if (args?.where?.status === 'active') return Promise.resolve(3);
          if (args?.where?.createdAt) return Promise.resolve(2);
          return Promise.resolve(5);
        }),
      },
      goal: {
        count: jest.fn((args?: { where?: { status?: string } }) => {
          if (args?.where?.status === 'active') return Promise.resolve(4);
          if (args?.where?.status === 'completed') return Promise.resolve(3);
          return Promise.resolve(7);
        }),
      },
      team: { count: jest.fn().mockResolvedValue(2) },
      goalPhoto: { count: jest.fn().mockResolvedValue(6) },
    };
    return prisma;
  }

  it('retorna apenas métricas agregadas com o recorte mensal UTC correto', async () => {
    const prisma = buildPrisma();
    const service = new AdminOverviewService(prisma as never);

    await expect(service.getOverview(new Date('2026-09-15T18:30:00.000Z'))).resolves.toEqual({
      users: { total: 5, active: 3, newThisMonth: 2 },
      goals: { total: 7, active: 4, completed: 3 },
      teams: { total: 2 },
      photos: { total: 6 },
    });

    expect(prisma.user.count).toHaveBeenCalledWith({ where: { createdAt: { gte: new Date('2026-09-01T00:00:00.000Z'), lt: new Date('2026-10-01T00:00:00.000Z') } } });
    expect(prisma.goalPhoto.count).toHaveBeenCalledTimes(1);
    expect(Object.keys(prisma.goalPhoto)).not.toContain('findMany');
  });

  it('conta a meta diária uma vez e não mistura ocorrências ou thumbnail com fotos', async () => {
    const prisma = buildPrisma();
    const service = new AdminOverviewService(prisma as never);

    await service.getOverview();

    expect(prisma.goal.count).toHaveBeenCalledTimes(3);
    expect(prisma.goalPhoto.count).toHaveBeenCalledTimes(1);
    expect(Object.keys(prisma).some((key) => key.toLowerCase().includes('occurrence'))).toBe(false);
  });

  it.each([
    ['USER', ForbiddenException],
    ['ADMIN', null],
    ['SUPER_ADMIN', null],
  ] as const)('aplica a política de acesso para %s', async (platformRole, expectedError) => {
    const service = { getOverview: jest.fn().mockResolvedValue({ users: { total: 0, active: 0, newThisMonth: 0 }, goals: { total: 0, active: 0, completed: 0 }, teams: { total: 0 }, photos: { total: 0 } }) };
    const controller = new AdminOverviewController(service as never);
    const request = { user: { id: 'user-1', email: 'user@example.com', name: 'User', platformRole, status: 'active' } };

    if (expectedError) await expect(Promise.resolve().then(() => controller.getOverview(request as never))).rejects.toBeInstanceOf(expectedError);
    else await expect(controller.getOverview(request as never)).resolves.toEqual(expect.objectContaining({ users: expect.any(Object) }));
  });

  it('bloqueia administrador desabilitado antes de consultar métricas', async () => {
    const service = { getOverview: jest.fn() };
    const controller = new AdminOverviewController(service as never);

    await expect(Promise.resolve().then(() => controller.getOverview({ user: { platformRole: 'ADMIN', status: 'disabled' } } as never))).rejects.toBeInstanceOf(UnauthorizedException);
    expect(service.getOverview).not.toHaveBeenCalled();
  });
});
