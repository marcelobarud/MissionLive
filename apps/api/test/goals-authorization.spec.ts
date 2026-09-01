import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GoalsService } from '../src/goals/goals.service';

type FakePrisma = { goal: { findFirst: jest.Mock; findUnique: jest.Mock; update: jest.Mock } };
function fakePrisma() { return { goal: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() }, goalMember: { findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() }, goalStep: { findFirst: jest.fn(), findMany: jest.fn(), aggregate: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() }, goalStepProgress: { upsert: jest.fn() }, $transaction: jest.fn() }; }

describe('GoalsService authorization boundary', () => {
  it('does not return a goal when the authenticated user is outside every scope', async () => {
    const prisma = fakePrisma() as unknown as FakePrisma; const service = new GoalsService(prisma as never); prisma.goal.findFirst.mockResolvedValue(null);
    await expect(service.get('user-a', 'goal-b')).rejects.toBeInstanceOf(NotFoundException);
    const query = prisma.goal.findFirst.mock.calls[0][0].where;
    expect(query.id).toBe('goal-b'); expect(query.OR).toHaveLength(4);
  });

  it('rejects structure updates by a viewer', async () => {
    const prisma = fakePrisma() as unknown as FakePrisma; const service = new GoalsService(prisma as never); prisma.goal.findUnique.mockResolvedValue({ id: 'goal-a', ownerUserId: 'owner', members: [{ userId: 'user-a', role: 'viewer' }], team: null });
    await expect(service.update('user-a', 'goal-a', { name: 'changed', startDate: '2026-01-01', tags: [] })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.goal.update).not.toHaveBeenCalled();
  });

  it('does not allow a non-owner to use owner override', async () => {
    const prisma = fakePrisma() as unknown as FakePrisma; const service = new GoalsService(prisma as never); prisma.goal.findFirst.mockResolvedValue(null);
    await expect(service.override('user-a', 'goal-a', { reason: 'done' })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
