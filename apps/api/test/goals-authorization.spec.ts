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

  it('returns derived participant progress with the collective summary and completion timestamps', async () => {
    const prisma = fakePrisma() as unknown as FakePrisma; const service = new GoalsService(prisma as never); const completedAt = new Date('2026-08-29T22:42:00.000Z');
    prisma.goal.findFirst.mockResolvedValue({
      id: 'goal-a', ownerUserId: 'owner', tagsJson: '[]', members: [
        { userId: 'user-a', role: 'viewer', user: { id: 'user-a', name: 'Teste A', avatarUrl: null } },
        { userId: 'user-b', role: 'editor', user: { id: 'user-b', name: 'Teste B', avatarUrl: null } },
      ],
      owner: { id: 'owner', name: 'Owner', email: 'hidden@example.test', avatarUrl: null }, team: null,
      steps: [
        { id: 'step-1', title: 'Primeiro passo', position: 0, progresses: [{ userId: 'owner', completed: true, completedAt }, { userId: 'user-a', completed: true, completedAt: null }] },
        { id: 'step-2', title: 'Segundo passo', position: 1, progresses: [{ userId: 'owner', completed: true, completedAt }] },
        { id: 'step-3', title: 'Terceiro passo', position: 2, progresses: [] },
      ],
    });

    const result = await service.get('user-a', 'goal-a');
    expect(result.participantsProgress).toMatchObject({ totalParticipants: 3, participantsCompleted: 0, collectiveCompletedSteps: 3, collectiveTotalSteps: 9, collectivePercentage: 33.3 });
    expect(result.participantsProgress?.participants.map((participant) => participant.name)).toEqual(['Owner', 'Teste A', 'Teste B']);
    expect(result.participantsProgress?.participants[0]).toMatchObject({ completedSteps: 2, totalSteps: 3, percentage: 66.7, status: 'in-progress' });
    expect(result.participantsProgress?.participants[0].steps[0].completedAt).toEqual(completedAt);
    expect(result.participantsProgress?.participants[0]).not.toHaveProperty('email');
  });

  it('handles collective participant progress without steps', async () => {
    const prisma = fakePrisma() as unknown as FakePrisma; const service = new GoalsService(prisma as never);
    prisma.goal.findFirst.mockResolvedValue({ id: 'goal-empty', ownerUserId: 'owner', tagsJson: '[]', members: [{ userId: 'user-a', role: 'viewer', user: { id: 'user-a', name: 'Teste A', avatarUrl: null } }], owner: { id: 'owner', name: 'Owner', avatarUrl: null }, team: null, steps: [] });
    const result = await service.get('user-a', 'goal-empty');
    expect(result.participantsProgress).toMatchObject({ totalParticipants: 2, participantsCompleted: 0, collectiveCompletedSteps: 0, collectiveTotalSteps: 0, collectivePercentage: 0 });
    expect(result.participantsProgress?.participants.every((participant) => participant.status === 'not-started')).toBe(true);
  });
});
