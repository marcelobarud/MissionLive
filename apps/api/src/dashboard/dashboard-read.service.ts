import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isValidTimezone, localDateAt } from '../common/timezone';
import { goalAccessWhere } from '../goals/goal-access';
import { participantIds, stepAppliesTo } from '../goals/goal-progress';
import { GoalsService } from '../goals/goals.service';
import { PrismaService } from '../prisma/prisma.service';

const DASHBOARD_LIST_LIMIT = 5;

type ProgressStep = { id: string; assignmentMode: string; assigneeUserId: string | null; progresses?: Array<{ completed: boolean }> };
type ProgressGoal = {
  id: string;
  ownerUserId: string;
  recurrenceType: string;
  recurrenceTimezone: string | null;
  members: Array<{ userId: string }>;
  team: { ownerUserId: string; members: Array<{ userId: string }> } | null;
  steps: ProgressStep[];
};
type DailyProgress = { goalId: string; stepProgresses: Array<{ goalStepId: string; completed: boolean }> };

function monthStart(date: Date, offset = 0) { return new Date(date.getFullYear(), date.getMonth() + offset, 1); }
function dayStart(date: Date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }

@Injectable()
export class DashboardReadService {
  constructor(private readonly prisma: PrismaService, private readonly goals: GoalsService) {}

  private accessible(userId: string): Prisma.GoalWhereInput { return goalAccessWhere(userId); }

  private async countMetrics(userId: string, now: Date) {
    const access = this.accessible(userId);
    const currentMonth = monthStart(now);
    const nextMonth = monthStart(now, 1);
    const currentYear = new Date(now.getFullYear(), 0, 1);
    const nextYear = new Date(now.getFullYear() + 1, 0, 1);
    const [total, completed, open, thisMonth, thisYear] = await Promise.all([
      this.prisma.goal.count({ where: access }),
      this.prisma.goal.count({ where: { AND: [access, { status: 'completed' }] } }),
      this.prisma.goal.count({ where: { AND: [access, { status: 'active' }] } }),
      this.prisma.goal.count({ where: { AND: [access, { startDate: { gte: currentMonth, lt: nextMonth } }] } }),
      this.prisma.goal.count({ where: { AND: [access, { startDate: { gte: currentYear, lt: nextYear } }] } }),
    ]);
    return { total, completed, open, thisMonth, thisYear };
  }

  private async categoryAndContext(userId: string) {
    const rows = await this.prisma.goal.findMany({
      where: this.accessible(userId),
      select: { category: { select: { name: true } }, customCategory: true, teamId: true, _count: { select: { members: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    const categoryCounts = new Map<string, number>();
    const contextCounts = new Map<string, number>();
    for (const row of rows) {
      const category = row.category?.name ?? row.customCategory ?? 'Sem categoria';
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
      const context = row.teamId ? 'Equipe' : row._count.members > 0 ? 'Compartilhada' : 'Individual';
      contextCounts.set(context, (contextCounts.get(context) ?? 0) + 1);
    }
    return {
      categoryBreakdown: [...categoryCounts.entries()].map(([label, count]) => ({ label, count })),
      contextBreakdown: [...contextCounts.entries()].map(([label, count]) => ({ label, count })),
    };
  }

  private async completionTimeline(userId: string, now: Date) {
    const firstMonth = monthStart(now, -5);
    const afterLastMonth = monthStart(now, 1);
    const rows = await this.prisma.goal.findMany({
      where: { AND: [this.accessible(userId), { status: 'completed', completedAt: { gte: firstMonth, lt: afterLastMonth } }] },
      select: { completedAt: true },
    });
    return Array.from({ length: 6 }, (_, index) => {
      const start = monthStart(now, index - 5);
      const next = monthStart(now, index - 4);
      const count = rows.filter((row) => row.completedAt && row.completedAt >= start && row.completedAt < next).length;
      return { label: start.toLocaleDateString('pt-BR', { month: 'short' }), count };
    });
  }

  private async rankedIds(userId: string, now: Date) {
    const access = this.accessible(userId);
    const today = dayStart(now);
    const [upcoming, overdue, recent] = await Promise.all([
      this.prisma.goal.findMany({ where: { AND: [access, { status: 'active', endDate: { not: null, gte: today } }] }, select: { id: true }, orderBy: [{ endDate: 'asc' }, { id: 'asc' }], take: DASHBOARD_LIST_LIMIT }),
      this.prisma.goal.findMany({ where: { AND: [access, { status: 'active', endDate: { not: null, lt: today } }] }, select: { id: true }, orderBy: [{ endDate: 'asc' }, { id: 'asc' }], take: DASHBOARD_LIST_LIMIT }),
      this.prisma.goal.findMany({ where: access, select: { id: true }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: DASHBOARD_LIST_LIMIT }),
    ]);
    return { upcoming: upcoming.map((row) => row.id), overdue: overdue.map((row) => row.id), recent: recent.map((row) => row.id) };
  }

  private async progressRows(userId: string, now: Date) {
    const access = this.accessible(userId);
    const participants = { select: { userId: true } } as const;
    const team = { select: { ownerUserId: true, members: participants } } as const;
    const [regular, daily] = await Promise.all([
      this.prisma.goal.findMany({
        where: { AND: [access, { status: 'active', recurrenceType: { not: 'DAILY' } }] },
        select: { id: true, ownerUserId: true, recurrenceType: true, recurrenceTimezone: true, members: participants, team, steps: { select: { id: true, assignmentMode: true, assigneeUserId: true, progresses: { where: { userId }, select: { completed: true } } } } },
      }),
      this.prisma.goal.findMany({
        where: { AND: [access, { status: 'active', recurrenceType: 'DAILY' }] },
        select: { id: true, ownerUserId: true, recurrenceType: true, recurrenceTimezone: true, members: participants, team, steps: { select: { id: true, assignmentMode: true, assigneeUserId: true } } },
      }),
    ]);
    const targets = daily.map((goal) => {
      if (!goal.recurrenceTimezone || !isValidTimezone(goal.recurrenceTimezone)) throw new BadRequestException('Daily goals require a valid IANA timezone.');
      return { goalId: goal.id, localDate: localDateAt(now, goal.recurrenceTimezone) };
    });
    const occurrences = targets.length ? await this.prisma.goalDailyOccurrence.findMany({ where: { OR: targets }, select: { goalId: true, stepProgresses: { where: { userId }, select: { goalStepId: true, completed: true } } } }) : [];
    return { goals: [...regular, ...daily] as ProgressGoal[], dailyProgress: new Map(occurrences.map((row) => [row.goalId, row as DailyProgress])) };
  }

  private progress(goal: ProgressGoal, userId: string, dailyProgress: Map<string, DailyProgress>) {
    if (!goal.steps.length) return 0;
    const ids = participantIds(goal);
    const currentDaily = dailyProgress.get(goal.id);
    const completed = goal.steps.filter((step) => {
      if (!stepAppliesTo(step, userId, ids)) return false;
      if (goal.recurrenceType === 'DAILY') return currentDaily?.stepProgresses.some((progress) => progress.goalStepId === step.id && progress.completed) ?? false;
      return step.progresses?.some((progress) => progress.completed) ?? false;
    }).length;
    // O Dashboard anterior usava todos os steps no denominador; manter essa semântica pública.
    return Math.round(completed / goal.steps.length * 100);
  }

  private async hydrate(userId: string, ids: string[]) {
    const uniqueIds = [...new Set(ids)];
    return uniqueIds.length ? this.goals.getAccessibleByIds(userId, uniqueIds) : [];
  }

  async summary(userId: string) {
    const now = new Date();
    const [counts, breakdown, timeline, rankings, progressRows] = await Promise.all([
      this.countMetrics(userId, now),
      this.categoryAndContext(userId),
      this.completionTimeline(userId, now),
      this.rankedIds(userId, now),
      this.progressRows(userId, now),
    ]);
    const progressById = new Map(progressRows.goals.map((goal) => [goal.id, this.progress(goal, userId, progressRows.dailyProgress)]));
    const activeProgressValues = progressRows.goals.map((goal) => progressById.get(goal.id) ?? 0);
    const activeProgress = activeProgressValues.length ? Math.round(activeProgressValues.reduce((sum, value) => sum + value, 0) / activeProgressValues.length) : 0;
    const nearlyComplete = progressRows.goals.filter((goal) => goal.steps.length > 0 && (progressById.get(goal.id) ?? 0) >= 75).sort((left, right) => (progressById.get(right.id) ?? 0) - (progressById.get(left.id) ?? 0) || left.id.localeCompare(right.id)).slice(0, DASHBOARD_LIST_LIMIT).map((goal) => goal.id);
    const ids = [...rankings.upcoming, ...rankings.overdue, ...nearlyComplete, ...rankings.recent];
    const hydrated = await this.hydrate(userId, ids);
    const byId = new Map(hydrated.map((goal) => [goal.id, goal]));
    const ordered = (goalIds: string[]) => goalIds.map((id) => byId.get(id)).filter((goal): goal is (typeof hydrated)[number] => Boolean(goal));
    return {
      counts: { ...counts, completionRate: counts.total ? Math.round(counts.completed / counts.total * 100) : 0, activeProgress },
      ...breakdown,
      upcomingDeadlines: ordered(rankings.upcoming),
      overdueGoals: ordered(rankings.overdue),
      nearlyCompleteGoals: ordered(nearlyComplete),
      completionTimeline: timeline,
      recentGoals: ordered(rankings.recent),
    };
  }
}
