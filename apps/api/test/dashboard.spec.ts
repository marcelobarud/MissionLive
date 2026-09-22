import { DashboardService } from '../src/dashboard/dashboard.service';

describe('DashboardService', () => {
  it('derives dashboard totals only from goals returned for the authenticated user', async () => {
    const goals = {
      list: jest.fn().mockResolvedValue([
        { id: 'goal-completed', status: 'completed', startDate: new Date(), completedAt: new Date(), endDate: null, category: { name: 'Saúde' }, team: null, members: [], steps: [{ progresses: [{ completed: true }] }] },
        { id: 'goal-active', status: 'active', startDate: new Date(), endDate: null, category: { name: 'Saúde' }, team: null, members: [{ userId: 'user-a' }], steps: [{ progresses: [{ completed: true }] }, { progresses: [] }] },
        { id: 'goal-empty', status: 'active', startDate: new Date(), endDate: null, category: null, customCategory: null, team: { id: 'team-a' }, members: [], steps: [] },
      ]),
    };
    const service = new DashboardService(goals as never);

    const summary = await service.summary('user-a');

    expect(goals.list).toHaveBeenCalledWith('user-a');
    expect(summary.counts).toMatchObject({ total: 3, completed: 1, open: 2, activeProgress: 25 });
    expect(summary.categoryBreakdown).toEqual(expect.arrayContaining([{ label: 'Saúde', count: 2 }, { label: 'Sem categoria', count: 1 }]));
    expect(summary.contextBreakdown).toEqual(expect.arrayContaining([{ label: 'Individual', count: 1 }, { label: 'Compartilhada', count: 1 }, { label: 'Equipe', count: 1 }]));
  });

  it('returns zeroed aggregates and empty collections when the user has no accessible goals', async () => {
    const goals = { list: jest.fn().mockResolvedValue([]) };
    const summary = await new DashboardService(goals as never).summary('user-a');
    expect(summary.counts).toMatchObject({ total: 0, completed: 0, open: 0, completionRate: 0, activeProgress: 0 });
    expect(summary.categoryBreakdown).toEqual([]);
    expect(summary.contextBreakdown).toEqual([]);
    expect(summary.recentGoals).toEqual([]);
  });
});
