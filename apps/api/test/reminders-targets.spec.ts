import { RemindersService } from '../src/reminders/reminders.service';

const baseGoal = {
  id: 'goal-a', name: 'Preparação', status: 'active', ownerUserId: 'owner', teamId: null,
  members: [{ userId: 'member', role: 'viewer' }, { userId: 'editor', role: 'editor' }], team: null,
  steps: [
    { id: 'step-all', title: 'Beber água', assignmentMode: 'ALL_PARTICIPANTS', assigneeUserId: null },
    { id: 'step-specific', title: 'Correr 5 KM', assignmentMode: 'SPECIFIC_PARTICIPANT', assigneeUserId: 'member' },
  ],
};

function setup(goal = baseGoal) {
  const tx = { reminder: { updateMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() } };
  const prisma = { goal: { findUnique: jest.fn().mockResolvedValue(goal) }, reminder: { create: jest.fn().mockResolvedValue({ id: 'reminder-1' }), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() }, $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) };
  const goals = { get: jest.fn().mockResolvedValue({ status: 'active' }), getRole: jest.fn().mockResolvedValue('owner') };
  const notifications = { createInternal: jest.fn().mockResolvedValue({ id: 'notification-1' }) };
  const push = { sendToUser: jest.fn() };
  const service = new RemindersService(prisma as never, goals as never, notifications as never, push as never);
  return { service, prisma, goals, tx, notifications, push };
}

const futureReminder = { goalId: 'goal-a', remindAt: '2099-09-09T15:30:00.000Z', timezone: 'America/Sao_Paulo' };

describe('RemindersService target policy', () => {
  it('permite ao owner direcionar reminder para participante válido', async () => {
    const { service, prisma } = setup();

    await service.create('owner', { ...futureReminder, targetUserId: 'member' });

    expect(prisma.reminder.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ creatorUserId: 'owner', targetUserId: 'member', goalId: 'goal-a', goalStepId: undefined }) }));
  });

  it('permite viewer criar para si, mas não para outro participante', async () => {
    const { service, prisma, goals } = setup();
    goals.getRole.mockResolvedValue('viewer');

    await service.create('member', { ...futureReminder, targetUserId: 'member' });
    await expect(service.create('member', { ...futureReminder, targetUserId: 'editor' })).rejects.toThrow('Viewers can only create reminders for themselves.');
    expect(prisma.reminder.create).toHaveBeenCalledTimes(1);
  });

  it('rejeita usuário externo como target', async () => {
    const { service } = setup();

    await expect(service.create('owner', { ...futureReminder, targetUserId: 'external' })).rejects.toThrow('The reminder target must participate in this goal.');
  });

  it('respeita aplicabilidade dos steps gerais e específicos', async () => {
    const { service, prisma } = setup();

    await service.create('owner', { ...futureReminder, targetUserId: 'editor', goalStepId: 'step-all' });
    await service.create('owner', { ...futureReminder, targetUserId: 'member', goalStepId: 'step-specific' });
    await expect(service.create('owner', { ...futureReminder, targetUserId: 'editor', goalStepId: 'step-specific' })).rejects.toThrow('The reminder target is not responsible for the selected step.');
    await expect(service.create('owner', { ...futureReminder, targetUserId: 'member', goalStepId: 'other-goal-step' })).rejects.toThrow('The selected step does not belong to this goal.');
    expect(prisma.reminder.create).toHaveBeenCalledTimes(2);
  });

  it('entrega aviso e push somente ao target e revalida membership', async () => {
    const { service, prisma, tx, notifications, push } = setup();
    const now = new Date('2026-09-09T12:00:00.000Z');
    prisma.reminder.findMany.mockResolvedValue([{ id: 'reminder-1' }]);
    tx.reminder.updateMany.mockResolvedValue({ count: 1 });
    tx.reminder.findUnique.mockResolvedValue({ id: 'reminder-1', creatorUserId: 'owner', targetUserId: 'member', goalId: 'goal-a', goalStepId: 'step-specific', goal: baseGoal, goalStep: baseGoal.steps[1] });
    tx.reminder.update.mockResolvedValue({});

    await service.processDue(now);

    expect(notifications.createInternal).toHaveBeenCalledWith({ userId: 'member', type: 'reminder_due', title: 'Lembrete de tarefa', body: 'Correr 5 KM\nMeta: Preparação', goalId: 'goal-a', reminderId: 'reminder-1' }, tx);
    expect(push.sendToUser).toHaveBeenCalledWith('member', expect.objectContaining({ title: 'MissionLive', body: 'Correr 5 KM Meta: Preparação' }));
    expect(push.sendToUser).not.toHaveBeenCalledWith('owner', expect.anything());

    tx.reminder.findUnique.mockResolvedValue({ id: 'reminder-1', creatorUserId: 'owner', targetUserId: 'removed', goalId: 'goal-a', goalStepId: null, goal: baseGoal, goalStep: null });
    await service.processDue(now);
    expect(notifications.createInternal).toHaveBeenCalledTimes(1);
    expect(tx.reminder.update).toHaveBeenCalledWith({ where: { id: 'reminder-1' }, data: { status: 'cancelled' } });
  });
});
