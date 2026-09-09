import { RemindersService } from '../src/reminders/reminders.service';

function reminderRecord(overrides: Partial<{ id: string; creatorUserId: string; targetUserId: string; goalId: string; status: string }> = {}) {
  return { id: overrides.id ?? 'reminder-1', creatorUserId: overrides.creatorUserId ?? 'user-a', targetUserId: overrides.targetUserId ?? 'user-a', goalId: overrides.goalId ?? 'goal-a', status: overrides.status ?? 'pending' };
}

function goalRecord() { return { id: 'goal-a', name: 'Correr 10 km', ownerUserId: 'user-a', teamId: null, members: [], team: null }; }

function setup() {
  const tx = { reminder: { updateMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() } };
  const prisma = { reminder: { findMany: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() }, $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) };
  const goals = {};
  const notifications = { createInternal: jest.fn() };
  const push = { sendToUser: jest.fn() };
  const service = new RemindersService(prisma as never, goals as never, notifications as never, push as never);
  return { service, prisma, tx, notifications, push };
}

describe('RemindersService delivery', () => {
  it('não processa reminders futuros, cancelados ou já processados', async () => {
    const { service, prisma, notifications } = setup();
    prisma.reminder.findMany.mockResolvedValue([]);

    await service.processDue(new Date('2026-09-08T12:00:00.000Z'));

    expect(prisma.reminder.findMany).toHaveBeenCalledWith({ where: { status: 'pending', remindAt: { lte: new Date('2026-09-08T12:00:00.000Z') } }, select: { id: true } });
    expect(notifications.createInternal).not.toHaveBeenCalled();
  });

  it('cria um Aviso interno para o usuário e meta corretos e tenta o Web Push', async () => {
    const { service, prisma, tx, notifications, push } = setup();
    const now = new Date('2026-09-08T12:00:00.000Z');
    prisma.reminder.findMany.mockResolvedValue([{ id: 'reminder-1' }]);
    tx.reminder.updateMany.mockResolvedValue({ count: 1 });
    tx.reminder.findUnique.mockResolvedValue({ ...reminderRecord(), goal: goalRecord(), goalStep: null });
    notifications.createInternal.mockResolvedValue({ id: 'notification-1' });
    tx.reminder.update.mockResolvedValue({});

    await service.processDue(now);

    expect(notifications.createInternal).toHaveBeenCalledWith({ userId: 'user-a', type: 'reminder_due', title: 'Lembrete da meta', body: 'Correr 10 km\nVocê tem um lembrete desta meta.', goalId: 'goal-a', reminderId: 'reminder-1', deliveryKey: 'reminder-1' }, tx);
    expect(tx.reminder.update).toHaveBeenCalledWith({ where: { id: 'reminder-1' }, data: { status: 'processed', deliveredAt: now } });
    expect(push.sendToUser).toHaveBeenCalledWith('user-a', { title: 'MissionLive', body: 'Correr 10 km Você tem um lembrete desta meta.', url: '/goals/goal-a', tag: 'missionlive-reminder-reminder-1' });
  });

  it('não duplica quando outra execução já obteve a posse do reminder', async () => {
    const { service, prisma, tx, notifications } = setup();
    prisma.reminder.findMany.mockResolvedValue([{ id: 'reminder-1' }]);
    tx.reminder.updateMany.mockResolvedValue({ count: 0 });

    await service.processDue();

    expect(notifications.createInternal).not.toHaveBeenCalled();
    expect(tx.reminder.findUnique).not.toHaveBeenCalled();
  });

  it('mantém o Aviso interno quando a entrega Web Push falha', async () => {
    const { service, prisma, tx, notifications, push } = setup();
    prisma.reminder.findMany.mockResolvedValue([{ id: 'reminder-1' }]);
    tx.reminder.updateMany.mockResolvedValue({ count: 1 });
    tx.reminder.findUnique.mockResolvedValue({ ...reminderRecord(), goal: goalRecord(), goalStep: null });
    notifications.createInternal.mockResolvedValue({ id: 'notification-1' });
    tx.reminder.update.mockResolvedValue({});
    push.sendToUser.mockRejectedValue(new Error('push indisponível'));

    await expect(service.processDue()).resolves.toBeUndefined();
    expect(notifications.createInternal).toHaveBeenCalledTimes(1);
    expect(tx.reminder.update).toHaveBeenCalledTimes(1);
  });
});
