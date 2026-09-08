import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { GoalsService } from '../src/goals/goals.service';

type FakePrisma = { goal: { findFirst: jest.Mock; findUnique: jest.Mock; update: jest.Mock } };
function fakePrisma() { return { goal: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() }, user: { findUnique: jest.fn() }, goalMember: { findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() }, goalStep: { findFirst: jest.fn(), findMany: jest.fn(), aggregate: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() }, goalStepProgress: { upsert: jest.fn() }, notification: { deleteMany: jest.fn() }, $transaction: jest.fn() }; }

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

  it('reorders every step transactionally and returns the persisted order', async () => {
    const prisma = fakePrisma(); const service = new GoalsService(prisma as never); const updates: unknown[] = [];
    prisma.goal.findUnique.mockResolvedValue({ id: 'goal-a', ownerUserId: 'owner', members: [], team: null });
    prisma.goalStep.findMany.mockResolvedValue([{ id: 'step-1' }, { id: 'step-2' }]);
    prisma.$transaction.mockImplementation(async (callback: (transaction: { goalStep: { update: jest.Mock } }) => Promise<void>) => callback({ goalStep: { update: jest.fn((args) => { updates.push(args); }) } }));
    prisma.goal.findFirst.mockResolvedValue({ id: 'goal-a', ownerUserId: 'owner', tagsJson: '[]', members: [], team: null, steps: [{ id: 'step-2', title: 'Segundo', position: 0, progresses: [{ userId: 'owner', completed: true }] }, { id: 'step-1', title: 'Primeiro', position: 1, progresses: [] }] });

    const result = await service.reorderSteps('owner', 'goal-a', { stepIds: ['step-2', 'step-1'] });

    expect(updates).toEqual([
      { where: { id: 'step-2' }, data: { position: 100000 } },
      { where: { id: 'step-1' }, data: { position: 100001 } },
      { where: { id: 'step-2' }, data: { position: 0 } },
      { where: { id: 'step-1' }, data: { position: 1 } },
    ]);
    expect(result.steps.map((step) => step.id)).toEqual(['step-2', 'step-1']);
    expect(result.steps[0].progresses).toEqual([{ userId: 'owner', completed: true }]);
  });

  it('appends a new step after the current maximum and reads steps in position order', async () => {
    const prisma = fakePrisma(); const service = new GoalsService(prisma as never);
    prisma.goal.findUnique.mockResolvedValue({ id: 'goal-a', ownerUserId: 'owner', members: [], team: null });
    prisma.goalStep.aggregate.mockResolvedValue({ _max: { position: 1 } });
    prisma.goalStep.create.mockResolvedValue({ id: 'step-3' });
    prisma.goal.findFirst.mockResolvedValue({ id: 'goal-a', ownerUserId: 'owner', tagsJson: '[]', members: [], team: null, steps: [{ id: 'step-1', title: 'Primeiro', position: 0, progresses: [] }, { id: 'step-2', title: 'Segundo', position: 1, progresses: [] }, { id: 'step-3', title: 'Terceiro', position: 2, progresses: [] }] });

    const result = await service.addStep('owner', 'goal-a', { title: '  Terceiro  ' });

    expect(prisma.goalStep.create).toHaveBeenCalledWith({ data: { goalId: 'goal-a', title: 'Terceiro', description: undefined, position: 2 } });
    expect(result.steps.map((step) => step.id)).toEqual(['step-1', 'step-2', 'step-3']);
  });

  it('rejects an incomplete or duplicated reorder without mutating steps', async () => {
    const prisma = fakePrisma(); const service = new GoalsService(prisma as never);
    prisma.goal.findUnique.mockResolvedValue({ id: 'goal-a', ownerUserId: 'owner', members: [], team: null });
    prisma.goalStep.findMany.mockResolvedValue([{ id: 'step-1' }, { id: 'step-2' }]);

    await expect(service.reorderSteps('owner', 'goal-a', { stepIds: ['step-1', 'step-1'] })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('updates an existing step in place so its ID and progress remain stable', async () => {
    const prisma = fakePrisma(); const service = new GoalsService(prisma as never);
    prisma.goal.findUnique.mockResolvedValue({ id: 'goal-a', ownerUserId: 'owner', members: [], team: null });
    prisma.goalStep.findFirst.mockResolvedValue({ id: 'step-1', goalId: 'goal-a' });
    prisma.goal.findFirst.mockResolvedValue({ id: 'goal-a', ownerUserId: 'owner', tagsJson: '[]', members: [], team: null, steps: [{ id: 'step-1', title: 'Revisado', position: 0, progresses: [{ userId: 'owner', completed: true }] }] });

    const result = await service.updateStep('owner', 'goal-a', 'step-1', { title: '  Revisado  ' });

    expect(prisma.goalStep.update).toHaveBeenCalledWith({ where: { id: 'step-1' }, data: { title: 'Revisado', description: null } });
    expect(prisma.goalStep.create).not.toHaveBeenCalled();
    expect(prisma.goalStep.delete).not.toHaveBeenCalled();
    expect(result.steps[0]).toMatchObject({ id: 'step-1', title: 'Revisado', position: 0, progresses: [{ userId: 'owner', completed: true }] });
  });

  it('creates a step assigned to a valid goal participant', async () => {
    const prisma = fakePrisma(); const service = new GoalsService(prisma as never);
    prisma.goal.findUnique.mockResolvedValue({ id: 'goal-a', ownerUserId: 'owner', members: [{ userId: 'ana' }], team: null });
    prisma.goalStep.aggregate.mockResolvedValue({ _max: { position: 0 } });
    prisma.user.findUnique.mockResolvedValue({ name: 'Ana' });
    prisma.goalStep.create.mockResolvedValue({ id: 'step-2' });
    prisma.goal.findFirst.mockResolvedValue({ id: 'goal-a', ownerUserId: 'owner', tagsJson: '[]', members: [{ userId: 'ana', role: 'viewer', user: { id: 'ana', name: 'Ana', email: 'ana@example.test', avatarUrl: null } }], owner: { id: 'owner', name: 'Owner', email: 'owner@example.test', avatarUrl: null }, team: null, steps: [] });

    await service.addStep('owner', 'goal-a', { title: 'Reservar hospedagem', assignmentMode: 'SPECIFIC_PARTICIPANT', assigneeUserId: 'ana' });

    expect(prisma.goalStep.create).toHaveBeenCalledWith({ data: { goalId: 'goal-a', title: 'Reservar hospedagem', description: undefined, position: 1, assignmentMode: 'SPECIFIC_PARTICIPANT', assigneeUserId: 'ana', assigneeName: 'Ana' } });
  });

  it('rejects assigning a step to someone outside the goal', async () => {
    const prisma = fakePrisma(); const service = new GoalsService(prisma as never);
    prisma.goal.findUnique.mockResolvedValue({ id: 'goal-a', ownerUserId: 'owner', members: [{ userId: 'ana' }], team: null });
    prisma.goalStep.aggregate.mockResolvedValue({ _max: { position: 0 } });

    await expect(service.addStep('owner', 'goal-a', { title: 'Passo privado', assignmentMode: 'SPECIFIC_PARTICIPANT', assigneeUserId: 'external' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.goalStep.create).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('allows only the assigned participant to update a specific step', async () => {
    const prisma = fakePrisma(); const service = new GoalsService(prisma as never);
    prisma.goal.findUnique.mockResolvedValue({ id: 'goal-a', ownerUserId: 'owner', members: [{ userId: 'ana', role: 'viewer' }, { userId: 'bruno', role: 'admin' }], team: null });
    prisma.goalStep.findFirst.mockResolvedValue({ id: 'step-1', goalId: 'goal-a', assignmentMode: 'SPECIFIC_PARTICIPANT', assigneeUserId: 'ana', assigneeName: 'Ana' });

    await expect(service.setProgress('bruno', 'goal-a', 'step-1', { completed: true })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.goalStepProgress.upsert).not.toHaveBeenCalled();
  });

  it('calculates individual progress only from applicable assignments', async () => {
    const prisma = fakePrisma(); const service = new GoalsService(prisma as never);
    const user = (id: string, name: string, role = 'viewer') => ({ userId: id, role, user: { id, name, email: `${id}@example.test`, avatarUrl: null } });
    prisma.goal.findFirst.mockResolvedValue({
      id: 'goal-a', ownerUserId: 'owner', tagsJson: '[]',
      owner: { id: 'owner', name: 'Owner', email: 'owner@example.test', avatarUrl: null },
      members: [user('ana', 'Ana'), user('bruno', 'Bruno'), user('carlos', 'Carlos')], team: null,
      steps: [
        { id: 'step-a', title: 'Escolher destino', position: 0, assignmentMode: 'ALL_PARTICIPANTS', assigneeUserId: null, assigneeName: null, progresses: [{ userId: 'carlos', completed: true }] },
        { id: 'step-b', title: 'Reservar hospedagem', position: 1, assignmentMode: 'SPECIFIC_PARTICIPANT', assigneeUserId: 'ana', assigneeName: 'Ana', assigneeUser: { id: 'ana', name: 'Ana', avatarUrl: null }, progresses: [{ userId: 'ana', completed: true }] },
        { id: 'step-c', title: 'Comprar passagens', position: 2, assignmentMode: 'SPECIFIC_PARTICIPANT', assigneeUserId: 'bruno', assigneeName: 'Bruno', assigneeUser: { id: 'bruno', name: 'Bruno', avatarUrl: null }, progresses: [] },
      ],
    });

    const result = await service.get('carlos', 'goal-a');
    const carlos = result.participantsProgress?.participants.find((participant) => participant.userId === 'carlos');
    expect(carlos).toMatchObject({ completedSteps: 1, totalSteps: 1, percentage: 100 });
    expect(result.participantsProgress).toMatchObject({ collectiveCompletedSteps: 2, collectiveTotalSteps: 6, collectivePercentage: 33.3 });
  });

  it('does not transfer old progress when reassigning a step', async () => {
    const prisma = fakePrisma(); const service = new GoalsService(prisma as never);
    prisma.goal.findUnique.mockResolvedValue({ id: 'goal-a', ownerUserId: 'owner', members: [{ userId: 'ana' }, { userId: 'bruno' }], team: null });
    prisma.goalStep.findFirst.mockResolvedValue({ id: 'step-1', goalId: 'goal-a', title: 'Reservar', description: null, position: 0, assignmentMode: 'SPECIFIC_PARTICIPANT', assigneeUserId: 'ana', assigneeName: 'Ana' });
    prisma.user.findUnique.mockResolvedValue({ name: 'Bruno' });
    prisma.goal.findFirst.mockResolvedValue({ id: 'goal-a', ownerUserId: 'owner', tagsJson: '[]', owner: { id: 'owner', name: 'Owner', email: 'owner@example.test', avatarUrl: null }, members: [{ userId: 'ana', role: 'viewer', user: { id: 'ana', name: 'Ana', email: 'ana@example.test', avatarUrl: null } }, { userId: 'bruno', role: 'viewer', user: { id: 'bruno', name: 'Bruno', email: 'bruno@example.test', avatarUrl: null } }], team: null, steps: [{ id: 'step-1', title: 'Reservar', position: 0, assignmentMode: 'SPECIFIC_PARTICIPANT', assigneeUserId: 'bruno', assigneeName: 'Bruno', progresses: [{ userId: 'ana', completed: true }] }] });

    const result = await service.updateStep('owner', 'goal-a', 'step-1', { title: 'Reservar', assignmentMode: 'SPECIFIC_PARTICIPANT', assigneeUserId: 'bruno' });

    expect(prisma.goalStep.update).toHaveBeenCalledWith({ where: { id: 'step-1' }, data: { title: 'Reservar', description: null, assignmentMode: 'SPECIFIC_PARTICIPANT', assigneeUserId: 'bruno', assigneeName: 'Bruno' } });
    expect(prisma.goalStepProgress.upsert).not.toHaveBeenCalled();
    expect(result.steps[0].progresses).toEqual([{ userId: 'ana', completed: true }]);
  });

  it('keeps an assignment unavailable when its participant leaves the scope', async () => {
    const prisma = fakePrisma() as unknown as FakePrisma; const service = new GoalsService(prisma as never);
    prisma.goal.findFirst.mockResolvedValue({
      id: 'goal-a', ownerUserId: 'owner', tagsJson: '[]', owner: { id: 'owner', name: 'Owner', email: 'owner@example.test', avatarUrl: null },
      members: [], team: null,
      steps: [{ id: 'step-1', title: 'Revisar', position: 0, assignmentMode: 'SPECIFIC_PARTICIPANT', assigneeUserId: 'former-member', assigneeName: 'Pessoa removida', progresses: [] }],
    });

    const result = await service.get('owner', 'goal-a');

    expect(result.steps[0]).toMatchObject({ assignmentMode: 'SPECIFIC_PARTICIPANT', assigneeUserId: 'former-member', assigneeName: 'Pessoa removida', assigneeAvailable: false, applicable: false });
    expect(result.progressSummary).toMatchObject({ completedSteps: 0, totalSteps: 0, unavailableSteps: 1 });
  });
});
