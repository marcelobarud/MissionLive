import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type NotificationWriter = Pick<PrismaClient, 'notification'> | Prisma.TransactionClient;

export type InternalNotificationInput = {
  userId: string;
  type: string;
  title: string;
  body: string;
  goalId?: string | null;
  teamId?: string | null;
  reminderId?: string | null;
  deliveryKey?: string | null;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}
  async createInternal(input: InternalNotificationInput, client: NotificationWriter = this.prisma) {
    return client.notification.create({ data: input });
  }
  async list(userId: string) { return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }); }
  async unreadCount(userId: string) { return { count: await this.prisma.notification.count({ where: { userId, readAt: null } }) }; }
  async markRead(userId: string, id: string) { const notification = await this.prisma.notification.findFirst({ where: { id, userId } }); if (!notification) throw new NotFoundException('Notification not found.'); return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } }); }
  async markAllRead(userId: string) { await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } }); return { read: true }; }
}
