import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoalsService } from '../goals/goals.service';
import { CreateReminderDto, UpdateReminderDto } from './reminders.dto';

@Injectable()
export class RemindersService {
  constructor(private readonly prisma: PrismaService, private readonly goals: GoalsService) {}

  private futureDate(value: string) { const date = new Date(value); if (Number.isNaN(date.valueOf()) || date <= new Date()) throw new BadRequestException('Reminder must be scheduled in the future.'); return date; }

  async list(userId: string) { return this.prisma.reminder.findMany({ where: { userId, status: { not: 'cancelled' } }, include: { goal: { select: { id: true, name: true, status: true, endDate: true } } }, orderBy: { remindAt: 'asc' } }); }

  async create(userId: string, dto: CreateReminderDto) { const goal = await this.goals.get(userId, dto.goalId); if (goal.status !== 'active') throw new BadRequestException('Reminders can only be added to active goals.'); const reminder = await this.prisma.reminder.create({ data: { userId, goalId: dto.goalId, remindAt: this.futureDate(dto.remindAt), timezone: dto.timezone.trim(), status: 'pending' }, include: { goal: { select: { id: true, name: true, status: true, endDate: true } } } }); return reminder; }

  async update(userId: string, reminderId: string, dto: UpdateReminderDto) { const existing = await this.prisma.reminder.findFirst({ where: { id: reminderId, userId, status: { not: 'cancelled' } } }); if (!existing) throw new NotFoundException('Reminder not found.'); return this.prisma.reminder.update({ where: { id: reminderId }, data: { ...(dto.remindAt ? { remindAt: this.futureDate(dto.remindAt), status: 'pending', deliveredAt: null } : {}), ...(dto.timezone ? { timezone: dto.timezone.trim() } : {}) }, include: { goal: { select: { id: true, name: true, status: true, endDate: true } } } }); }

  async cancel(userId: string, reminderId: string) { const existing = await this.prisma.reminder.findFirst({ where: { id: reminderId, userId } }); if (!existing) throw new NotFoundException('Reminder not found.'); await this.prisma.reminder.update({ where: { id: reminderId }, data: { status: 'cancelled' } }); return { cancelled: true }; }
}
