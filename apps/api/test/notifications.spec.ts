import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from '../src/notifications/notifications.service';

describe('NotificationsService ownership boundary', () => {
  function setup() {
    const prisma = {
      notification: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(2),
        findFirst: jest.fn().mockResolvedValue({ id: 'notification-a', userId: 'user-a', readAt: null }),
        update: jest.fn().mockResolvedValue({ id: 'notification-a', userId: 'user-a', readAt: new Date() }),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };
    return { service: new NotificationsService(prisma as never), prisma };
  }

  it('lists only the authenticated user’s notifications with a bounded newest-first query', async () => {
    const { service, prisma } = setup();
    await service.list('user-a');
    expect(prisma.notification.findMany).toHaveBeenCalledWith({ where: { userId: 'user-a' }, orderBy: { createdAt: 'desc' }, take: 50 });
  });

  it('counts only unread notifications belonging to the authenticated user', async () => {
    const { service, prisma } = setup();
    await expect(service.unreadCount('user-a')).resolves.toEqual({ count: 2 });
    expect(prisma.notification.count).toHaveBeenCalledWith({ where: { userId: 'user-a', readAt: null } });
  });

  it('marks a notification read only after resolving it within the owner scope', async () => {
    const { service, prisma } = setup();
    await service.markRead('user-a', 'notification-a');
    expect(prisma.notification.findFirst).toHaveBeenCalledWith({ where: { id: 'notification-a', userId: 'user-a' } });
    expect(prisma.notification.update).toHaveBeenCalledWith({ where: { id: 'notification-a' }, data: { readAt: expect.any(Date) } });

    prisma.notification.findFirst.mockResolvedValueOnce(null);
    await expect(service.markRead('user-a', 'notification-owned-by-b')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.notification.update).toHaveBeenCalledTimes(1);
  });

  it('marks all unread notifications for only the authenticated user', async () => {
    const { service, prisma } = setup();
    await expect(service.markAllRead('user-a')).resolves.toEqual({ read: true });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({ where: { userId: 'user-a', readAt: null }, data: { readAt: expect.any(Date) } });
  });
});
