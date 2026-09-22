import { REMINDER_MAX_BATCHES_PER_RUN, REMINDER_PROCESS_BATCH_SIZE, RemindersService } from '../src/reminders/reminders.service';

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

    expect(prisma.reminder.findMany).toHaveBeenCalledWith({ where: { status: 'pending', remindAt: { lte: new Date('2026-09-08T12:00:00.000Z') } }, select: { id: true }, orderBy: [{ remindAt: 'asc' }, { id: 'asc' }], take: REMINDER_PROCESS_BATCH_SIZE });
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

  it('processa menos de um lote sem buscar backlog ilimitado', async () => {
    const { service, prisma, tx } = setup();
    prisma.reminder.findMany.mockResolvedValue([{ id: 'reminder-2' }, { id: 'reminder-1' }]);
    tx.reminder.updateMany.mockResolvedValue({ count: 0 });

    await service.processDue(new Date('2026-09-08T12:00:00.000Z'));

    expect(prisma.reminder.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.reminder.findMany.mock.calls[0][0]).toMatchObject({ orderBy: [{ remindAt: 'asc' }, { id: 'asc' }], take: REMINDER_PROCESS_BATCH_SIZE });
    expect(tx.reminder.updateMany).toHaveBeenCalledTimes(2);
  });

  it('limita cada consulta ao tamanho do lote e processa exatamente um lote', async () => {
    const { service, prisma, tx } = setup();
    const ids = Array.from({ length: REMINDER_PROCESS_BATCH_SIZE }, (_, index) => ({ id: `reminder-${index}` }));
    prisma.reminder.findMany.mockResolvedValueOnce(ids).mockResolvedValueOnce([]);
    tx.reminder.updateMany.mockResolvedValue({ count: 0 });

    await service.processDue(new Date('2026-09-08T12:00:00.000Z'));

    expect(prisma.reminder.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.reminder.findMany.mock.calls[0][0].take).toBe(REMINDER_PROCESS_BATCH_SIZE);
    expect(tx.reminder.updateMany).toHaveBeenCalledTimes(REMINDER_PROCESS_BATCH_SIZE);
  });

  it('não ultrapassa o máximo de lotes e deixa o restante para o próximo ciclo', async () => {
    const { service, prisma, tx } = setup();
    const ids = Array.from({ length: REMINDER_PROCESS_BATCH_SIZE * (REMINDER_MAX_BATCHES_PER_RUN + 1) }, (_, index) => `reminder-${index}`);
    prisma.reminder.findMany.mockImplementation(async (query: { where: { id?: { notIn?: string[] } } }) => {
      const excluded = new Set(query.where.id?.notIn ?? []);
      return ids.filter((id) => !excluded.has(id)).slice(0, REMINDER_PROCESS_BATCH_SIZE).map((id) => ({ id }));
    });
    tx.reminder.updateMany.mockResolvedValue({ count: 0 });

    await service.processDue(new Date('2026-09-08T12:00:00.000Z'));

    expect(prisma.reminder.findMany).toHaveBeenCalledTimes(REMINDER_MAX_BATCHES_PER_RUN);
    expect(tx.reminder.updateMany).toHaveBeenCalledTimes(REMINDER_PROCESS_BATCH_SIZE * REMINDER_MAX_BATCHES_PER_RUN);
  });

  it('continua com os seguintes quando um reminder falha', async () => {
    const { service, prisma, tx } = setup();
    prisma.reminder.findMany.mockResolvedValue([{ id: 'failed-reminder' }, { id: 'next-reminder' }]);
    tx.reminder.updateMany.mockRejectedValueOnce(new Error('falha controlada')).mockResolvedValue({ count: 0 });

    await expect(service.processDue()).resolves.toBeUndefined();
    expect(tx.reminder.updateMany).toHaveBeenCalledTimes(2);
  });

  it('ignora um segundo tick enquanto o primeiro ainda está executando', async () => {
    const { service, prisma } = setup();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    prisma.reminder.findMany.mockImplementation(async () => { await gate; return []; });

    const first = service.processDue();
    await Promise.resolve();
    const second = service.processDue();
    await second;
    expect(prisma.reminder.findMany).toHaveBeenCalledTimes(1);
    release();
    await first;
  });

  it('libera a proteção quando a execução falha', async () => {
    const { service, prisma } = setup();
    prisma.reminder.findMany.mockRejectedValueOnce(new Error('falha controlada')).mockResolvedValueOnce([]);

    await expect(service.processDue()).rejects.toThrow('falha controlada');
    await expect(service.processDue()).resolves.toBeUndefined();
    expect(prisma.reminder.findMany).toHaveBeenCalledTimes(2);
  });
});
