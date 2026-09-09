import { GoalsService } from '../src/goals/goals.service';

function dailyGoal() {
  return { id: 'goal-daily', ownerUserId: 'owner', recurrenceType: 'DAILY', recurrenceTimezone: 'America/Sao_Paulo', status: 'active', startDate: new Date('2026-09-09T00:00:00.000Z'), endDate: null, members: [], team: null };
}

describe('GoalsService daily goals', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date('2026-09-09T12:00:00.000Z')));
  afterEach(() => jest.useRealTimers());

  it('fixa o timezone do criador ao criar a meta diária', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ timezone: 'America/Sao_Paulo' }) },
      goal: { create: jest.fn().mockResolvedValue({ id: 'goal-daily', teamId: null }) },
    };
    const service = new GoalsService(prisma as never);
    jest.spyOn(service, 'get').mockResolvedValue({ id: 'goal-daily' } as never);

    await service.create('owner', { name: 'Correr', startDate: '2026-09-09', recurrenceType: 'DAILY' });

    expect(prisma.goal.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ recurrenceType: 'DAILY', recurrenceTimezone: 'America/Sao_Paulo' }) }));
  });

  it('persiste progresso em ocorrências distintas sem alterar o progresso normal', async () => {
    const progressByDate = new Map<string, Array<{ goalStepId: string; userId: string; completed: boolean }>>();
    const tx = {
      goal: { findUnique: jest.fn(async ({ include }: { include?: { dailyOccurrences?: { where: { localDate: string } } } }) => {
        const localDate = include?.dailyOccurrences?.where.localDate ?? '';
        return { ...dailyGoal(), steps: [{ id: 'step-1', assignmentMode: 'ALL_PARTICIPANTS', assigneeUserId: null }], dailyOccurrences: [{ id: `occ-${localDate}`, stepProgresses: progressByDate.get(localDate) ?? [] }] };
      }) },
      goalDailyOccurrence: { upsert: jest.fn(async ({ create }: { create: { localDate: string } }) => ({ id: `occ-${create.localDate}`, localDate: create.localDate })) , update: jest.fn() },
      goalDailyStepProgress: { upsert: jest.fn(async ({ create, update }: { create: { occurrenceId: string; goalStepId: string; userId: string; completed: boolean }; update: { completed: boolean } }) => {
        const localDate = create.occurrenceId.replace('occ-', ''); const rows = progressByDate.get(localDate) ?? []; const current = rows.find((row) => row.goalStepId === create.goalStepId && row.userId === create.userId);
        if (current) current.completed = update.completed; else rows.push({ goalStepId: create.goalStepId, userId: create.userId, completed: create.completed }); progressByDate.set(localDate, rows); return {};
      }) },
    };
    const prisma = { goal: { findUnique: jest.fn().mockResolvedValue(dailyGoal()), goalStep: undefined }, goalStep: { findFirst: jest.fn().mockResolvedValue({ id: 'step-1', assignmentMode: 'ALL_PARTICIPANTS', assigneeUserId: null }) }, goalStepProgress: { upsert: jest.fn() }, $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) };
    const service = new GoalsService(prisma as never);
    jest.spyOn(service, 'get').mockResolvedValue({ ...dailyGoal(), steps: [], tags: [] } as never);

    await service.setProgress('owner', 'goal-daily', 'step-1', { completed: true });
    jest.setSystemTime(new Date('2026-09-10T12:00:00.000Z'));
    await service.setProgress('owner', 'goal-daily', 'step-1', { completed: false });

    expect(prisma.goalStepProgress.upsert).not.toHaveBeenCalled();
    expect(tx.goalDailyOccurrence.upsert).toHaveBeenCalledTimes(2);
    expect([...progressByDate.keys()]).toEqual(['2026-09-09', '2026-09-10']);
    expect(progressByDate.get('2026-09-09')).toEqual([{ goalStepId: 'step-1', userId: 'owner', completed: true }]);
    expect(progressByDate.get('2026-09-10')).toEqual([{ goalStepId: 'step-1', userId: 'owner', completed: false }]);
  });

  it('usa a fronteira diária do timezone persistido e não o timezone do processo', async () => {
    const tx = { goal: { findUnique: jest.fn().mockResolvedValue({ ...dailyGoal(), steps: [], dailyOccurrences: [] }) }, goalDailyOccurrence: { upsert: jest.fn().mockResolvedValue({ id: 'occurrence' }), update: jest.fn() }, goalDailyStepProgress: { upsert: jest.fn() } };
    const prisma = { goal: { findUnique: jest.fn().mockResolvedValue(dailyGoal()) }, goalStep: { findFirst: jest.fn().mockResolvedValue({ id: 'step-1', assignmentMode: 'ALL_PARTICIPANTS', assigneeUserId: null }) }, goalStepProgress: { upsert: jest.fn() }, $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) };
    const service = new GoalsService(prisma as never);
    jest.spyOn(service, 'get').mockResolvedValue({ ...dailyGoal(), steps: [], tags: [] } as never);

    await service.setProgress('owner', 'goal-daily', 'step-1', { completed: true });

    expect(tx.goalDailyOccurrence.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { goalId_localDate: { goalId: 'goal-daily', localDate: '2026-09-09' } } }));
  });
});
