import { Injectable } from '@nestjs/common';
import { Goal } from '@prisma/client';
import { GoalsService } from '../goals/goals.service';

type PublicGoal = { status: string; startDate: Date | string; endDate?: Date | string | null; category?: { name: string } | null; customCategory?: string | null; team?: unknown; members?: unknown[]; steps: Array<{ progresses?: Array<{ completed: boolean }> }> };

@Injectable()
export class DashboardService {
  constructor(private readonly goals: GoalsService) {}

  async summary(userId: string) {
    const items = await this.goals.list(userId) as unknown as PublicGoal[]; const now = new Date(); const month = now.getMonth(); const year = now.getFullYear();
    const completed = items.filter((goal) => goal.status === 'completed'); const active = items.filter((goal) => goal.status === 'active');
    const thisMonth = items.filter((goal) => { const date = new Date(goal.startDate); return date.getMonth() === month && date.getFullYear() === year; });
    const thisYear = items.filter((goal) => new Date(goal.startDate).getFullYear() === year);
    const progress = (goal: PublicGoal) => goal.steps.length ? Math.round(goal.steps.filter((step) => step.progresses?.some((item) => item.completed)).length / goal.steps.length * 100) : 0;
    const activeProgress = active.length ? Math.round(active.reduce((total, goal) => total + progress(goal), 0) / active.length) : 0;
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const upcomingDeadlines = active.filter((goal) => goal.endDate && new Date(goal.endDate) >= startOfToday).sort((a, b) => new Date(a.endDate!).valueOf() - new Date(b.endDate!).valueOf()).slice(0, 5);
    const overdueGoals = active.filter((goal) => goal.endDate && new Date(goal.endDate) < startOfToday).sort((a, b) => new Date(a.endDate!).valueOf() - new Date(b.endDate!).valueOf()).slice(0, 5);
    const nearlyCompleteGoals = active.filter((goal) => goal.steps.length > 0 && progress(goal) >= 75).sort((a, b) => progress(b) - progress(a)).slice(0, 5);
    const categoryCounts = new Map<string, number>(); const contextCounts = new Map<string, number>();
    for (const goal of items) { const category = goal.category?.name ?? goal.customCategory ?? 'Sem categoria'; categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1); const context = goal.team ? 'Equipe' : goal.members?.length ? 'Compartilhada' : 'Individual'; contextCounts.set(context, (contextCounts.get(context) ?? 0) + 1); }
    const completionTimeline = Array.from({ length: 6 }, (_, index) => { const date = new Date(year, month - (5 - index), 1); const next = new Date(date.getFullYear(), date.getMonth() + 1, 1); return { label: date.toLocaleDateString('pt-BR', { month: 'short' }), count: completed.filter((goal) => { const completion = new Date((goal as unknown as Goal).completedAt ?? 0); return completion >= date && completion < next; }).length }; });
    return { counts: { completed: completed.length, open: active.length, thisMonth: thisMonth.length, thisYear: thisYear.length, total: items.length, completionRate: items.length ? Math.round(completed.length / items.length * 100) : 0, activeProgress }, categoryBreakdown: [...categoryCounts.entries()].map(([label, count]) => ({ label, count })), contextBreakdown: [...contextCounts.entries()].map(([label, count]) => ({ label, count })), upcomingDeadlines, overdueGoals, nearlyCompleteGoals, completionTimeline, recentGoals: items.slice(0, 5) };
  }
}
