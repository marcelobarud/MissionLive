import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoalsService } from '../goals/goals.service';

export const MAX_CALENDAR_RANGE_DAYS = 366;
const DAY_IN_MILLISECONDS = 86_400_000;

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService, private readonly goals: GoalsService) {}
  async list(userId: string, from?: string, to?: string) {
    const start = from ? new Date(from) : new Date(); const end = to ? new Date(to) : new Date(start.valueOf() + 31 * DAY_IN_MILLISECONDS);
    if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end <= start || end.valueOf() - start.valueOf() > MAX_CALENDAR_RANGE_DAYS * DAY_IN_MILLISECONDS) throw new BadRequestException('Invalid calendar range.');
    const goals = await this.goals.listForCalendar(userId, start, end);
    const reminders = await this.prisma.reminder.findMany({ where: { targetUserId: userId, status: 'pending', remindAt: { gte: start, lt: end } }, include: { goal: { select: { id: true, name: true } } }, orderBy: { remindAt: 'asc' } });
    return { from: start.toISOString(), to: end.toISOString(), goals, reminders };
  }
}
