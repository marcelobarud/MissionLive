import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { PushSubscriptionDto } from './push.dto';

export type ReminderPushPayload = { title: string; body: string; url: string; tag?: string };

function statusCodeOf(error: unknown) { return typeof error === 'object' && error !== null && 'statusCode' in error ? Number((error as { statusCode?: unknown }).statusCode) : undefined; }
function configValue(value: string | undefined) { return (value ?? '').trim().replace(/^['"]|['"]$/g, ''); }

@Injectable()
export class PushService {
  private readonly publicKey: string;
  private readonly configured: boolean;

  constructor(private readonly prisma: PrismaService, config: ConfigService) {
    this.publicKey = configValue(config.get<string>('VAPID_PUBLIC_KEY'));
    const privateKey = configValue(config.get<string>('VAPID_PRIVATE_KEY'));
    const subject = configValue(config.get<string>('VAPID_SUBJECT'));
    this.configured = Boolean(this.publicKey && privateKey && subject);
    if (this.configured) webpush.setVapidDetails(subject, this.publicKey, privateKey);
  }

  getPublicKey() { return { publicKey: this.publicKey || null, enabled: this.configured }; }

  async subscribe(userId: string, dto: PushSubscriptionDto) {
    const existing = await this.prisma.pushSubscription.findUnique({ where: { endpoint: dto.endpoint } });
    if (existing && existing.userId !== userId) throw new ConflictException('Push subscription already belongs to another user.');
    if (existing) return this.prisma.pushSubscription.update({ where: { id: existing.id }, data: { p256dh: dto.p256dh, auth: dto.auth, revokedAt: null } });
    try {
      return await this.prisma.pushSubscription.create({ data: { userId, endpoint: dto.endpoint, p256dh: dto.p256dh, auth: dto.auth } });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
      const concurrent = await this.prisma.pushSubscription.findUnique({ where: { endpoint: dto.endpoint } });
      if (!concurrent || concurrent.userId !== userId) throw new ConflictException('Push subscription already belongs to another user.');
      return this.prisma.pushSubscription.update({ where: { id: concurrent.id }, data: { p256dh: dto.p256dh, auth: dto.auth, revokedAt: null } });
    }
  }

  async unsubscribe(userId: string, endpoint: string) {
    const existing = await this.prisma.pushSubscription.findUnique({ where: { endpoint } });
    if (!existing || existing.userId !== userId) return { removed: false };
    await this.prisma.pushSubscription.update({ where: { id: existing.id }, data: { revokedAt: new Date() } });
    return { removed: true };
  }

  async sendToUser(userId: string, payload: ReminderPushPayload) {
    if (!this.configured) return;
    const subscriptions = await this.prisma.pushSubscription.findMany({ where: { userId, revokedAt: null } });
    await Promise.allSettled(subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify(payload), { TTL: 60 });
      } catch (error) {
        if ([404, 410].includes(statusCodeOf(error) ?? 0)) await this.prisma.pushSubscription.updateMany({ where: { id: subscription.id, revokedAt: null }, data: { revokedAt: new Date() } });
      }
    }));
  }
}
