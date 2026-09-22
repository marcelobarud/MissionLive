import { DashboardReadService } from '../src/dashboard/dashboard-read.service';

type QueryArgs = { where?: { AND?: Array<Record<string, unknown>> }; select?: Record<string, unknown>; orderBy?: unknown };

function filtersOf(args: QueryArgs) { return args.where?.AND ?? []; }
function statusOf(args: QueryArgs) { return filtersOf(args).find((filter) => typeof filter.status === 'string')?.status; }
function recurrenceOf(args: QueryArgs) { return filtersOf(args).find((filter) => 'recurrenceType' in filter)?.recurrenceType; }

describe('DashboardReadService', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date('2026-09-15T12:00:00.000Z')));
  afterEach(() => jest.useRealTimers());

  it('preserves the dashboard contract with scoped aggregates, assignments and daily progress', async () => {
    const cards = new Map([
      ['goal-upcoming', { id: 'goal-upcoming', name: 'Meta futura', endDate: '2026-10-01T00:00:00.000Z' }],
      ['goal-overdue', { id: 'goal-overdue', name: 'Meta atrasada', endDate: '2026-09-01T00:00:00.000Z' }],
      ['goal-nearly', { id: 'goal-nearly', name: 'Meta quase concluída', endDate: null }],
      ['goal-daily', { id: 'goal-daily', name: 'Meta diária', endDate: null }],
      ['goal-completed', { id: 'goal-completed', name: 'Meta concluída', endDate: null }],
    ]);
    const goals = { list: jest.fn(), getAccessibleByIds: jest.fn().mockImplementation(async (_userId: string, ids: string[]) => ids.map((id) => cards.get(id)).filter(Boolean)) };
    const goalFindMany = jest.fn().mockImplementation((raw: unknown) => {
      const args = raw as QueryArgs;
      if (args.select?.category) return [{ category: { name: 'Saúde' }, customCategory: null, teamId: null, _count: { members: 2 } }, { category: null, customCategory: 'Planejamento', teamId: 'team-a', _count: { members: 0 } }, { category: null, customCategory: null, teamId: null, _count: { members: 0 } }];
      if (args.select?.completedAt) return [{ completedAt: new Date('2026-09-04T00:00:00.000Z') }, { completedAt: new Date('2026-08-03T00:00:00.000Z') }];
      if (args.select?.id && !args.select.steps) {
        const order = JSON.stringify(args.orderBy);
        if (order.includes('endDate')) {
          const endDate = filtersOf(args).find((filter) => 'endDate' in filter)?.endDate as Record<string, unknown> | undefined;
          return endDate && 'gte' in endDate ? [{ id: 'goal-upcoming' }] : [{ id: 'goal-overdue' }];
        }
        return [{ id: 'goal-nearly' }, { id: 'goal-daily' }, { id: 'goal-completed' }];
      }
      if (args.select?.steps) {
        if (recurrenceOf(args) === 'DAILY') return [{ id: 'goal-daily', ownerUserId: 'user-a', recurrenceType: 'DAILY', recurrenceTimezone: 'UTC', members: [], team: null, steps: [{ id: 'daily-a', assignmentMode: 'ALL_PARTICIPANTS', assigneeUserId: null }, { id: 'daily-b', assignmentMode: 'ALL_PARTICIPANTS', assigneeUserId: null }] }];
        return [
          { id: 'goal-upcoming', ownerUserId: 'user-a', recurrenceType: 'NONE', recurrenceTimezone: null, members: [{ userId: 'user-b' }], team: null, steps: [{ id: 'upcoming-a', assignmentMode: 'ALL_PARTICIPANTS', assigneeUserId: null, progresses: [{ completed: true }] }, { id: 'upcoming-b', assignmentMode: 'SPECIFIC_PARTICIPANT', assigneeUserId: 'user-b', progresses: [{ completed: true }] }] },
          { id: 'goal-overdue', ownerUserId: 'user-a', recurrenceType: 'NONE', recurrenceTimezone: null, members: [], team: null, steps: [{ id: 'overdue-a', assignmentMode: 'ALL_PARTICIPANTS', assigneeUserId: null, progresses: [] }] },
          { id: 'goal-nearly', ownerUserId: 'user-a', recurrenceType: 'NONE', recurrenceTimezone: null, members: [], team: null, steps: [0, 1, 2, 3].map((position) => ({ id: `nearly-${position}`, assignmentMode: 'ALL_PARTICIPANTS', assigneeUserId: null, progresses: [{ completed: position < 3 }] })) },
        ];
      }
      return [];
    });
    const prisma = {
      goal: {
        count: jest.fn().mockImplementation(async (raw: unknown) => {
          const args = raw as QueryArgs;
          if (statusOf(args) === 'completed') return 2;
          if (statusOf(args) === 'active') return 4;
          if (filtersOf(args).some((filter) => 'startDate' in filter)) return 6;
          return 6;
        }),
        findMany: goalFindMany,
      },
      goalDailyOccurrence: { findMany: jest.fn().mockResolvedValue([{ goalId: 'goal-daily', stepProgresses: [{ goalStepId: 'daily-a', completed: true }] }]) },
    };

    const summary = await new DashboardReadService(prisma as never, goals as never).summary('user-a');

    expect(summary.counts).toEqual({ completed: 2, open: 4, thisMonth: 6, thisYear: 6, total: 6, completionRate: 33, activeProgress: 44 });
    expect(summary.categoryBreakdown).toEqual([{ label: 'Saúde', count: 1 }, { label: 'Planejamento', count: 1 }, { label: 'Sem categoria', count: 1 }]);
    expect(summary.contextBreakdown).toEqual([{ label: 'Compartilhada', count: 1 }, { label: 'Equipe', count: 1 }, { label: 'Individual', count: 1 }]);
    expect(summary.completionTimeline).toEqual(expect.arrayContaining([{ label: 'set.', count: 1 }, { label: 'ago.', count: 1 }]));
    expect(summary.upcomingDeadlines.map((goal) => goal.id)).toEqual(['goal-upcoming']);
    expect(summary.overdueGoals.map((goal) => goal.id)).toEqual(['goal-overdue']);
    expect(summary.nearlyCompleteGoals.map((goal) => goal.id)).toEqual(['goal-nearly']);
    expect(summary.recentGoals.map((goal) => goal.id)).toEqual(['goal-nearly', 'goal-daily', 'goal-completed']);
    expect(goals.list).not.toHaveBeenCalled();
    expect(goals.getAccessibleByIds).toHaveBeenCalledWith('user-a', expect.any(Array));
    expect(goals.getAccessibleByIds.mock.calls[0][1]).toHaveLength(5);
    expect(goals.getAccessibleByIds.mock.calls[0][1].length).toBeLessThanOrEqual(20);
  });

  it('does not hydrate hundreds of goals to build five-item lists', async () => {
    const goals = { list: jest.fn(), getAccessibleByIds: jest.fn().mockResolvedValue([]) };
    const manyRows = Array.from({ length: 500 }, (_, index) => ({ id: `goal-${index}`, ownerUserId: 'user-a', recurrenceType: 'NONE', recurrenceTimezone: null, members: [], team: null, steps: [{ id: `step-${index}`, assignmentMode: 'ALL_PARTICIPANTS', assigneeUserId: null, progresses: [] }] }));
    const prisma = {
      goal: {
        count: jest.fn().mockResolvedValue(500),
        findMany: jest.fn().mockImplementation((raw: unknown) => {
          const args = raw as QueryArgs;
          if (args.select?.category) return Array.from({ length: 500 }, () => ({ category: null, customCategory: null, teamId: null, _count: { members: 0 } }));
          if (args.select?.completedAt) return [];
          if (args.select?.id && !args.select.steps) return manyRows.slice(0, 5);
          if (recurrenceOf(args) === 'DAILY') return [];
          if (args.select?.steps) return manyRows;
          return [];
        }),
      },
      goalDailyOccurrence: { findMany: jest.fn().mockResolvedValue([]) },
    };
    await new DashboardReadService(prisma as never, goals as never).summary('user-a');

    expect(goals.getAccessibleByIds.mock.calls[0][1].length).toBeLessThanOrEqual(20);
    expect(goals.getAccessibleByIds.mock.calls[0][1].length).not.toBe(500);
    expect(goals.list).not.toHaveBeenCalled();
  });

  it('returns the complete empty-state contract without hydrating goals', async () => {
    const goals = { getAccessibleByIds: jest.fn().mockResolvedValue([]) };
    const prisma = {
      goal: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      goalDailyOccurrence: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const summary = await new DashboardReadService(prisma as never, goals as never).summary('user-a');

    expect(summary.counts).toEqual({ completed: 0, open: 0, thisMonth: 0, thisYear: 0, total: 0, completionRate: 0, activeProgress: 0 });
    expect(summary.categoryBreakdown).toEqual([]);
    expect(summary.contextBreakdown).toEqual([]);
    expect(summary.upcomingDeadlines).toEqual([]);
    expect(summary.overdueGoals).toEqual([]);
    expect(summary.nearlyCompleteGoals).toEqual([]);
    expect(summary.recentGoals).toEqual([]);
    expect(summary.completionTimeline).toHaveLength(6);
    expect(goals.getAccessibleByIds).not.toHaveBeenCalled();
  });
});
