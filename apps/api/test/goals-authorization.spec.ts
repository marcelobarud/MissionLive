import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GoalsService } from '../src/goals/goals.service';

type FakePrisma = { goal: { findFirst: jest.Mock; findUnique: jest.Mock; update: jest.Mock } };
function fakePrisma() { return { goal: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() }, goalMember: { findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() }, goalStep: { findFirst: jest.fn(), findMany: jest.fn(), aggregate: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() }, goalStepProgress: { upsert: jest.fn() }, notification: { deleteMany: jest.fn() }, $transaction: jest.fn() }; }

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

  it('permanently deletes only when the authenticated user owns the goal', async () => {
    const prisma = fakePrisma(); const service = new GoalsService(prisma as never); const tx = { notification: { deleteMany: jest.fn() }, goal: { delete: jest.fn() } };
    prisma.goal.findUnique.mockResolvedValue({ ownerUserId: 'owner' });
    prisma.$transaction.mockImplementation(async (callback: (transaction: typeof tx) => Promise<void>) => callback(tx));
    await expect(service.hardDelete('owner', 'goal-a')).resolves.toEqual({ deleted: true });
    expect(tx.notification.deleteMany).toHaveBeenCalledWith({ where: { goalId: 'goal-a' } });
    expect(tx.goal.delete).toHaveBeenCalledWith({ where: { id: 'goal-a' } });
  });

  it('forbids team owners, members and unrelated users from deleting another user’s goal', async () => {
    const prisma = fakePrisma(); const service = new GoalsService(prisma as never); prisma.goal.findUnique.mockResolvedValue({ ownerUserId: 'goal-owner' });
    await expect(service.hardDelete('team-owner', 'goal-a')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.hardDelete('editor', 'goal-a')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns not found without starting a deletion transaction for a missing goal', async () => {
    const prisma = fakePrisma(); const service = new GoalsService(prisma as never); prisma.goal.findUnique.mockResolvedValue(null);
    await expect(service.hardDelete('owner', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
