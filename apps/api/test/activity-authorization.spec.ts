import { ActivityService } from '../src/activity/activity.service';

describe('ActivityService authorization boundary', () => {
  it('builds a scoped resource query and never asks for an unscoped feed', async () => {
    const prisma = { activityEvent: { findMany: jest.fn().mockResolvedValue([]) } };
    const service = new ActivityService(prisma as never);
    await service.list('user-a', { limit: 20 });
    const query = prisma.activityEvent.findMany.mock.calls[0][0];
    expect(query.where.OR).toHaveLength(2);
    expect(query.take).toBe(21);
    expect(query.skip).toBe(0);
    expect(query.where.OR[0].goal.OR).toEqual(expect.arrayContaining([{ ownerUserId: 'user-a' }, { members: { some: { userId: 'user-a' } } }]));
  });

  it('returns pagination metadata while keeping the scoped query', async () => {
    const prisma = { activityEvent: { findMany: jest.fn().mockResolvedValue([{ id: 'a', metadataJson: '{}' }, { id: 'b', metadataJson: '{}' }, { id: 'c', metadataJson: '{}' }]) } };
    const service = new ActivityService(prisma as never);
    const page = await service.list('user-a', { limit: 2, offset: 2 });
    expect(page.items).toHaveLength(2);
    expect(page.hasMore).toBe(true);
    expect(page.nextOffset).toBe(4);
    expect(prisma.activityEvent.findMany.mock.calls[0][0].skip).toBe(2);
  });
});
