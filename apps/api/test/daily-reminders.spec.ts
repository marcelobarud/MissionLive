import { RemindersService } from '../src/reminders/reminders.service';

describe('RemindersService daily delivery', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date('2026-09-09T09:00:00.000Z')));
  afterEach(() => jest.useRealTimers());

  it('calcula a primeira entrega no timezone fixado pela meta diária', async () => {
    const prisma = { goal: { findUnique: jest.fn() }, reminder: { create: jest.fn().mockResolvedValue({ id: 'reminder-daily' }) } };
    const goals = { get: jest.fn(), getRole: jest.fn().mockResolvedValue('owner') }; const notifications = {}; const push = {};
    const service = new RemindersService(prisma as never, goals as never, notifications as never, push as never);
    const goal = { id: 'goal-daily', name: 'Correr', status: 'active', ownerUserId: 'owner', teamId: null, recurrenceType: 'DAILY', recurrenceTimezone: 'America/Sao_Paulo', startDate: new Date('2026-09-09T00:00:00.000Z'), endDate: null, members: [], team: null, steps: [] };
    goals.get.mockResolvedValue({ ...goal, startDate: goal.startDate.toISOString(), endDate: null }); prisma.goal.findUnique.mockResolvedValue(goal);

    await service.create('owner', { goalId: goal.id, timeOfDay: '07:00', recurrenceType: 'DAILY', timezone: 'Europe/London' });

    expect(prisma.reminder.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ recurrenceType: 'DAILY', timeOfDay: '07:00', timezone: 'America/Sao_Paulo', remindAt: new Date('2026-09-09T10:00:00.000Z') }) }));
  });

  it('entrega uma vez por data local e mantém o reminder ativo para o próximo dia', async () => {
    const tx = { reminder: { updateMany: jest.fn().mockResolvedValue({ count: 1 }), findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) } };
    const prisma = { reminder: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn() }, $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) };
    const goals = { get: jest.fn(), getRole: jest.fn() }; const notifications = { createInternal: jest.fn().mockResolvedValue({ id: 'notification' }) }; const push = { sendToUser: jest.fn() };
    const service = new RemindersService(prisma as never, goals as never, notifications as never, push as never);
    const goal = { id: 'goal-daily', name: 'Correr', status: 'active', ownerUserId: 'owner', teamId: null, recurrenceType: 'DAILY', recurrenceTimezone: 'America/Sao_Paulo', startDate: new Date('2026-09-09T00:00:00.000Z'), endDate: null, members: [], team: null };
    const reminder = { id: 'reminder-daily', creatorUserId: 'owner', targetUserId: 'owner', goalId: 'goal-daily', recurrenceType: 'DAILY', timeOfDay: '07:00', timezone: 'America/Sao_Paulo', remindAt: new Date('2026-09-09T10:00:00.000Z'), goal, goalStep: null };
    prisma.reminder.findMany.mockResolvedValue([{ id: reminder.id }]); tx.reminder.findUnique.mockResolvedValue(reminder);

    await service.processDue(new Date('2026-09-09T10:01:00.000Z'));
    expect(notifications.createInternal).toHaveBeenCalledWith(expect.objectContaining({ deliveryKey: 'reminder-daily:2026-09-09' }), tx);
    expect(tx.reminder.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'pending', remindAt: new Date('2026-09-10T10:00:00.000Z') }) }));

    tx.reminder.findUnique.mockResolvedValue({ ...reminder, remindAt: new Date('2026-09-10T10:00:00.000Z') });
    await service.processDue(new Date('2026-09-10T10:01:00.000Z'));
    expect(notifications.createInternal).toHaveBeenCalledWith(expect.objectContaining({ deliveryKey: 'reminder-daily:2026-09-10' }), tx);
    expect(notifications.createInternal).toHaveBeenCalledTimes(2);
  });
});
