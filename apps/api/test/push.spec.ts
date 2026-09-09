import webpush from 'web-push';
import { PushService } from '../src/push/push.service';

jest.mock('web-push', () => ({ setVapidDetails: jest.fn(), sendNotification: jest.fn() }));

function config(values: Record<string, string>) { return { get: jest.fn((key: string) => values[key]) }; }

describe('PushService', () => {
  it('impede que um usuário assuma a subscription de outro', async () => {
    const prisma = { pushSubscription: { findUnique: jest.fn().mockResolvedValue({ id: 'subscription-b', userId: 'user-b' }) } };
    const service = new PushService(prisma as never, config({ VAPID_PUBLIC_KEY: 'public', VAPID_PRIVATE_KEY: 'private', VAPID_SUBJECT: 'mailto:test@example.invalid' }) as never);

    await expect(service.subscribe('user-a', { endpoint: 'https://push.example/subscription', p256dh: 'public-key', auth: 'auth-key' })).rejects.toThrow('another user');
  });

  it('reativa uma subscription própria de forma idempotente', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'subscription-a' });
    const prisma = { pushSubscription: { findUnique: jest.fn().mockResolvedValue({ id: 'subscription-a', userId: 'user-a', revokedAt: new Date() }), update } };
    const service = new PushService(prisma as never, config({}) as never);

    await service.subscribe('user-a', { endpoint: 'https://push.example/subscription', p256dh: 'public-key', auth: 'auth-key' });

    expect(update).toHaveBeenCalledWith({ where: { id: 'subscription-a' }, data: { p256dh: 'public-key', auth: 'auth-key', revokedAt: null } });
  });

  it('marca subscriptions expiradas sem impedir outras entregas', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = { pushSubscription: { findMany: jest.fn().mockResolvedValue([{ id: 'subscription-a', endpoint: 'https://push.example/a', p256dh: 'public-key', auth: 'auth-key' }, { id: 'subscription-b', endpoint: 'https://push.example/b', p256dh: 'public-key', auth: 'auth-key' }]), updateMany } };
    const sendNotification = webpush.sendNotification as jest.Mock;
    sendNotification.mockReset().mockRejectedValueOnce({ statusCode: 410 }).mockResolvedValueOnce({});
    const service = new PushService(prisma as never, config({ VAPID_PUBLIC_KEY: 'public', VAPID_PRIVATE_KEY: 'private', VAPID_SUBJECT: 'mailto:test@example.invalid' }) as never);

    await service.sendToUser('user-a', { title: 'MissionLive', body: 'Lembrete', url: '/goals/goal-a' });

    expect(sendNotification).toHaveBeenCalledTimes(2);
    expect(updateMany).toHaveBeenCalledWith({ where: { id: 'subscription-a', revokedAt: null }, data: { revokedAt: expect.any(Date) } });
  });
});
