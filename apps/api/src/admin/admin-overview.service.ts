import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type UtcMonthRange = { start: Date; end: Date };

export function currentUtcMonthRange(now = new Date()): UtcMonthRange {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

@Injectable()
export class AdminOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(now = new Date()) {
    const { start, end } = currentUtcMonthRange(now);
    const [usersTotal, usersActive, usersNewThisMonth, goalsTotal, goalsActive, goalsCompleted, teamsTotal, photosTotal] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'active' } }),
      this.prisma.user.count({ where: { createdAt: { gte: start, lt: end } } }),
      this.prisma.goal.count(),
      this.prisma.goal.count({ where: { status: 'active' } }),
      this.prisma.goal.count({ where: { status: 'completed' } }),
      this.prisma.team.count(),
      this.prisma.goalPhoto.count(),
    ]);

    return {
      users: { total: usersTotal, active: usersActive, newThisMonth: usersNewThisMonth },
      goals: { total: goalsTotal, active: goalsActive, completed: goalsCompleted },
      teams: { total: teamsTotal },
      photos: { total: photosTotal },
    };
  }
}
