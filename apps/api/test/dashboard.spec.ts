import { DashboardService } from '../src/dashboard/dashboard.service';

describe('DashboardService', () => {
  it('delegates to the read model and never falls back to GoalsService.list', async () => {
    const readModel = { summary: jest.fn().mockResolvedValue({ counts: { total: 0 }, recentGoals: [] }) };
    const goals = { list: jest.fn() };
    const summary = await new DashboardService(readModel as never).summary('user-a');

    expect(summary).toEqual({ counts: { total: 0 }, recentGoals: [] });
    expect(readModel.summary).toHaveBeenCalledWith('user-a');
    expect(goals.list).not.toHaveBeenCalled();
  });
});
