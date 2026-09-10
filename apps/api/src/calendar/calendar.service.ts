import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoalsService } from '../goals/goals.service';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService, private readonly goals: GoalsService) {}
  async list(userId: string, from?: string, to?: string) {
    const start = from ? new Date(from) : new Date(); const end = to ? new Date(to) : new Date(start.valueOf() + 31 * 86_400_000);
    if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end <= start) throw new BadRequestException('Invalid calendar range.');
    const goals = await this.goals.list(userId, { deadlineFrom: start.toISOString(), deadlineTo: end.toISOString(), sort: 'deadline' });
    const reminders = await this.prisma.reminder.findMany({ where: { targetUserId: userId, status: 'pending', remindAt: { gte: start, lt: end } }, include: { goal: { select: { id: true, name: true } } }, orderBy: { remindAt: 'asc' } });
    return { from: start.toISOString(), to: end.toISOString(), goals, reminders };
  }
}
