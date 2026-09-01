import { ActivityService } from '../src/activity/activity.service';

describe('ActivityService authorization boundary', () => {
  it('builds a scoped resource query and never asks for an unscoped feed', async () => {
    const prisma = { activityEvent: { findMany: jest.fn().mockResolvedValue([]) } };
    const service = new ActivityService(prisma as never);
    await service.list('user-a', '20');
    const query = prisma.activityEvent.findMany.mock.calls[0][0];
    expect(query.where.OR).toHaveLength(2);
    expect(query.take).toBe(20);
    expect(query.where.OR[0].goal.OR).toEqual(expect.arrayContaining([{ ownerUserId: 'user-a' }, { members: { some: { userId: 'user-a' } } }]));
  });
});
