import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GoalsService } from '../goals/goals.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PushService } from '../push/push.service';
import { CreateReminderDto, UpdateReminderDto } from './reminders.dto';

type ParticipantSource = {
  ownerUserId: string;
  members: Array<{ userId: string; role: string }>;
  team: { ownerUserId: string; members: Array<{ userId: string; role: string }> } | null;
};

type ReminderStep = { id: string; title: string; assignmentMode: string; assigneeUserId: string | null };

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

  private reminderInclude = {
    goal: { select: { id: true, name: true, status: true, endDate: true } },
    goalStep: { select: { id: true, title: true } },
    creator: { select: { id: true, name: true, avatarUrl: true } },
    target: { select: { id: true, name: true, avatarUrl: true } },
  } as const;

  private async goalContext(client: PrismaService | Prisma.TransactionClient, goalId: string) {
    return client.goal.findUnique({
      where: { id: goalId },
      select: {
        id: true,
        name: true,
        status: true,
        ownerUserId: true,
        teamId: true,
        members: { select: { userId: true, role: true } },
        team: { select: { ownerUserId: true, members: { select: { userId: true, role: true } } } },
        steps: { select: { id: true, title: true, assignmentMode: true, assigneeUserId: true } },
      },
    });
  }

  private participantRoles(source: ParticipantSource) {
    const participants = new Map<string, string>([[source.ownerUserId, 'owner']]);
    for (const member of source.members) if (!participants.has(member.userId)) participants.set(member.userId, member.role);
    if (source.team) {
      participants.set(source.team.ownerUserId, 'owner');
      for (const member of source.team.members) if (!participants.has(member.userId)) participants.set(member.userId, member.role);
    }
    return participants;
  }

  private stepAppliesTo(step: Pick<ReminderStep, 'assignmentMode' | 'assigneeUserId'>, targetUserId: string, participants: Map<string, string>) {
    return participants.has(targetUserId) && (step.assignmentMode !== 'SPECIFIC_PARTICIPANT' || step.assigneeUserId === targetUserId);
  }

  private async resolveTarget(creatorUserId: string, dto: CreateReminderDto) {
    const goal = await this.goals.get(creatorUserId, dto.goalId);
    if (goal.status !== 'active') throw new BadRequestException('Reminders can only be added to active goals.');
    const creatorRole = await this.goals.getRole(creatorUserId, dto.goalId);
    const context = await this.goalContext(this.prisma, dto.goalId);
    if (!context) throw new NotFoundException('Goal not found.');
    const participants = this.participantRoles(context);
    const step = dto.goalStepId ? context.steps.find((candidate) => candidate.id === dto.goalStepId) : undefined;
    if (dto.goalStepId && !step) throw new BadRequestException('The selected step does not belong to this goal.');
    const targetUserId = dto.targetUserId ?? (step?.assignmentMode === 'SPECIFIC_PARTICIPANT' ? step.assigneeUserId ?? creatorUserId : creatorUserId);
    if (!participants.has(targetUserId)) throw new BadRequestException('The reminder target must participate in this goal.');
    if (targetUserId !== creatorUserId && creatorRole === 'viewer') throw new ForbiddenException('Viewers can only create reminders for themselves.');
    if (step && !this.stepAppliesTo(step, targetUserId, participants)) throw new BadRequestException('The reminder target is not responsible for the selected step.');
    return { targetUserId, step };
  }

  async list(userId: string) {
    return this.prisma.reminder.findMany({ where: { OR: [{ creatorUserId: userId }, { targetUserId: userId }], status: 'pending', remindAt: { gt: new Date() } }, include: this.reminderInclude, orderBy: { remindAt: 'asc' } });
  }

  async create(creatorUserId: string, dto: CreateReminderDto) {
    const { targetUserId, step } = await this.resolveTarget(creatorUserId, dto);
    return this.prisma.reminder.create({ data: { creatorUserId, targetUserId, goalId: dto.goalId, goalStepId: step?.id, remindAt: this.futureDate(dto.remindAt), timezone: dto.timezone.trim(), status: 'pending' }, include: this.reminderInclude });
  }

  async update(creatorUserId: string, reminderId: string, dto: UpdateReminderDto) {
    const existing = await this.prisma.reminder.findFirst({ where: { id: reminderId, creatorUserId, status: { not: 'cancelled' } } });
    if (!existing) throw new NotFoundException('Reminder not found.');
    return this.prisma.reminder.update({ where: { id: reminderId }, data: { ...(dto.remindAt ? { remindAt: this.futureDate(dto.remindAt), status: 'pending', deliveredAt: null } : {}), ...(dto.timezone ? { timezone: dto.timezone.trim() } : {}) }, include: this.reminderInclude });
  }

  async cancel(userId: string, reminderId: string) {
    const existing = await this.prisma.reminder.findUnique({ where: { id: reminderId }, select: { creatorUserId: true, goal: { select: { ownerUserId: true, team: { select: { ownerUserId: true } } } } } });
    if (!existing || (existing.creatorUserId !== userId && existing.goal.ownerUserId !== userId && existing.goal.team?.ownerUserId !== userId)) throw new NotFoundException('Reminder not found.');
    await this.prisma.reminder.update({ where: { id: reminderId }, data: { status: 'cancelled' } });
    return { cancelled: true };
  }

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
      const reminder = await tx.reminder.findUnique({ where: { id: reminderId }, include: { goal: { select: { id: true, name: true, status: true, ownerUserId: true, teamId: true, members: { select: { userId: true, role: true } }, team: { select: { ownerUserId: true, members: { select: { userId: true, role: true } } } } } }, goalStep: { select: { id: true, title: true, assignmentMode: true, assigneeUserId: true } } } });
      if (!reminder) return null;
      const participants = this.participantRoles(reminder.goal);
      if (!participants.has(reminder.targetUserId) || (reminder.goalStep && !this.stepAppliesTo(reminder.goalStep, reminder.targetUserId, participants))) {
        await tx.reminder.update({ where: { id: reminder.id }, data: { status: 'cancelled' } });
        return null;
      }
      const title = reminder.goalStep ? 'Lembrete de tarefa' : 'Lembrete da meta';
      const body = reminder.goalStep ? `${reminder.goalStep.title}\nMeta: ${reminder.goal.name}` : `${reminder.goal.name}\nVocê tem um lembrete desta meta.`;
      const notification = await this.notifications.createInternal({ userId: reminder.targetUserId, type: 'reminder_due', title, body, goalId: reminder.goalId, reminderId: reminder.id }, tx);
      await tx.reminder.update({ where: { id: reminder.id }, data: { status: 'processed', deliveredAt: now } });
      return { userId: reminder.targetUserId, goalId: reminder.goalId, reminderId: reminder.id, title, body, notificationId: notification.id };
    });
    if (result) await this.push.sendToUser(result.userId, { title: 'MissionLive', body: result.body.replace('\n', ' '), url: `/goals/${result.goalId}`, tag: `missionlive-reminder-${result.reminderId}` });
  }
}
