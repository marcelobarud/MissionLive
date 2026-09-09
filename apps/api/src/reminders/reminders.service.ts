import { BadRequestException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoalsService } from '../goals/goals.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PushService } from '../push/push.service';
import { CreateReminderDto, UpdateReminderDto } from './reminders.dto';

@Injectable()
export class RemindersService implements OnModuleInit, OnModuleDestroy {
  private poller?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService, private readonly goals: GoalsService, private readonly notifications: NotificationsService, private readonly push: PushService) {}

  onModuleInit() {
    void this.processDue();
    this.poller = setInterval(() => { void this.processDue(); }, 60_000);
    this.poller.unref();
  }

  onModuleDestroy() { if (this.poller) clearInterval(this.poller); }

  private futureDate(value: string) { const date = new Date(value); if (Number.isNaN(date.valueOf()) || date <= new Date()) throw new BadRequestException('Reminder must be scheduled in the future.'); return date; }

  async list(userId: string) { return this.prisma.reminder.findMany({ where: { userId, status: { not: 'cancelled' } }, include: { goal: { select: { id: true, name: true, status: true, endDate: true } } }, orderBy: { remindAt: 'asc' } }); }

  async create(userId: string, dto: CreateReminderDto) { const goal = await this.goals.get(userId, dto.goalId); if (goal.status !== 'active') throw new BadRequestException('Reminders can only be added to active goals.'); const reminder = await this.prisma.reminder.create({ data: { userId, goalId: dto.goalId, remindAt: this.futureDate(dto.remindAt), timezone: dto.timezone.trim(), status: 'pending' }, include: { goal: { select: { id: true, name: true, status: true, endDate: true } } } }); return reminder; }

  async update(userId: string, reminderId: string, dto: UpdateReminderDto) { const existing = await this.prisma.reminder.findFirst({ where: { id: reminderId, userId, status: { not: 'cancelled' } } }); if (!existing) throw new NotFoundException('Reminder not found.'); return this.prisma.reminder.update({ where: { id: reminderId }, data: { ...(dto.remindAt ? { remindAt: this.futureDate(dto.remindAt), status: 'pending', deliveredAt: null } : {}), ...(dto.timezone ? { timezone: dto.timezone.trim() } : {}) }, include: { goal: { select: { id: true, name: true, status: true, endDate: true } } } }); }

  async cancel(userId: string, reminderId: string) { const existing = await this.prisma.reminder.findFirst({ where: { id: reminderId, userId } }); if (!existing) throw new NotFoundException('Reminder not found.'); await this.prisma.reminder.update({ where: { id: reminderId }, data: { status: 'cancelled' } }); return { cancelled: true }; }

  async processDue(now = new Date()) {
    const candidates = await this.prisma.reminder.findMany({ where: { status: 'pending', remindAt: { lte: now } }, select: { id: true } });
    for (const candidate of candidates) {
      try { await this.processOne(candidate.id, now); } catch { /* One reminder must not prevent the others from being processed. */ }
    }
  }

  private async processOne(reminderId: string, now: Date) {
    const result = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.reminder.updateMany({ where: { id: reminderId, status: 'pending', remindAt: { lte: now } }, data: { status: 'processing' } });
      if (!claimed.count) return null;
      const reminder = await tx.reminder.findUnique({ where: { id: reminderId }, include: { goal: { select: { id: true, name: true } } } });
      if (!reminder) return null;
      const title = 'Lembrete da meta';
      const body = `${reminder.goal.name}\nVocê definiu um lembrete para esta meta.`;
      const notification = await this.notifications.createInternal({ userId: reminder.userId, type: 'reminder_due', title, body, goalId: reminder.goalId, reminderId: reminder.id }, tx);
      await tx.reminder.update({ where: { id: reminder.id }, data: { status: 'processed', deliveredAt: now } });
      return { userId: reminder.userId, goalId: reminder.goalId, reminderId: reminder.id, title, body, notificationId: notification.id };
    });
    if (result) await this.push.sendToUser(result.userId, { title: `MissionLive · ${result.title}`, body: result.body.replace('\n', ' '), url: `/goals/${result.goalId}`, tag: `missionlive-reminder-${result.reminderId}` });
  }
}
