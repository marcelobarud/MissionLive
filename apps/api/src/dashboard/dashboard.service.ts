import { Injectable } from '@nestjs/common';
import { GoalsService } from '../goals/goals.service';

@Injectable()
export class DashboardService {
  constructor(private readonly goals: GoalsService) {}
  async summary(userId: string) {
    const items = await this.goals.list(userId); const now = new Date(); const month = now.getMonth(); const year = now.getFullYear();
    const completed = items.filter((goal) => goal.status === 'completed'); const open = items.filter((goal) => goal.status === 'active'); const thisMonth = items.filter((goal) => new Date(goal.startDate).getMonth() === month && new Date(goal.startDate).getFullYear() === year); const thisYear = items.filter((goal) => new Date(goal.startDate).getFullYear() === year);
    const categoryCounts = new Map<string, number>(); for (const goal of items) { const key = goal.category?.name ?? goal.customCategory ?? 'Sem categoria'; categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1); }
    return { counts: { completed: completed.length, open: open.length, thisMonth: thisMonth.length, thisYear: thisYear.length, total: items.length, completionRate: items.length ? Math.round(completed.length / items.length * 100) : 0 }, categoryBreakdown: [...categoryCounts.entries()].map(([label, count]) => ({ label, count })), recentGoals: items.slice(0, 5) };
  }
}
