import { RemindersService } from '../src/reminders/reminders.service';

function setup() {
  const prisma = { reminder: { findMany: jest.fn(), create: jest.fn() } };
  const goals = { get: jest.fn() };
  const notifications = { createInternal: jest.fn() };
  const push = { sendToUser: jest.fn() };
  const service = new RemindersService(prisma as never, goals as never, notifications as never, push as never);
  return { service, prisma, goals };
}

describe('RemindersService', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date('2026-09-09T12:00:00.000Z')));
  afterEach(() => jest.useRealTimers());

  it('lista somente lembretes pendentes e futuros', async () => {
    const { service, prisma } = setup();
    prisma.reminder.findMany.mockResolvedValue([]);

    await service.list('user-a');

    expect(prisma.reminder.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-a', status: 'pending', remindAt: { gt: new Date('2026-09-09T12:00:00.000Z') } },
    }));
  });

  it.each([
    '2026-09-09T11:59:59.000Z',
    '2026-09-09T12:00:00.000Z',
  ])('rejeita horário passado ou atual (%s)', async (remindAt) => {
    const { service, goals, prisma } = setup();
    goals.get.mockResolvedValue({ status: 'active' });

    await expect(service.create('user-a', { goalId: 'goal-a', remindAt, timezone: 'America/Sao_Paulo' })).rejects.toThrow('Reminder must be scheduled in the future.');
    expect(prisma.reminder.create).not.toHaveBeenCalled();
  });

  it('aceita horário futuro e preserva o fuso informado', async () => {
    const { service, goals, prisma } = setup();
    goals.get.mockResolvedValue({ status: 'active' });
    prisma.reminder.create.mockResolvedValue({ id: 'reminder-1' });

    await service.create('user-a', { goalId: 'goal-a', remindAt: '2026-09-09T12:01:00.000Z', timezone: 'America/Sao_Paulo' });

    expect(prisma.reminder.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: 'user-a', goalId: 'goal-a', timezone: 'America/Sao_Paulo', status: 'pending', remindAt: new Date('2026-09-09T12:01:00.000Z') }),
    }));
  });
});
