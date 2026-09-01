import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}
  async list(userId: string) { return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }); }
  async unreadCount(userId: string) { return { count: await this.prisma.notification.count({ where: { userId, readAt: null } }) }; }
  async markRead(userId: string, id: string) { const notification = await this.prisma.notification.findFirst({ where: { id, userId } }); if (!notification) throw new NotFoundException('Notification not found.'); return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } }); }
  async markAllRead(userId: string) { await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } }); return { read: true }; }
}
