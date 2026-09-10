import { BadRequestException } from '@nestjs/common';
import { CalendarService } from '../src/calendar/calendar.service';

function setup() {
  const prisma = { reminder: { findMany: jest.fn() } };
  const goals = { list: jest.fn() };
  const service = new CalendarService(prisma as never, goals as never);
  return { service, prisma, goals };
}

describe('CalendarService', () => {
  it('lista metas pelo prazo no intervalo mensal semiaberto', async () => {
    const { service, prisma, goals } = setup();
    goals.list.mockResolvedValue([]);
    prisma.reminder.findMany.mockResolvedValue([]);

    await service.list('user-a', '2026-09-01', '2026-10-01');

    expect(goals.list).toHaveBeenCalledWith('user-a', { deadlineFrom: '2026-09-01T00:00:00.000Z', deadlineTo: '2026-10-01T00:00:00.000Z', sort: 'deadline' });
    expect(prisma.reminder.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { targetUserId: 'user-a', status: 'pending', remindAt: { gte: new Date('2026-09-01T00:00:00.000Z'), lt: new Date('2026-10-01T00:00:00.000Z') } } }));
  });

  it('rejeita intervalo vazio ou invertido', async () => {
    const { service } = setup();
    await expect(service.list('user-a', '2026-10-01', '2026-10-01')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.list('user-a', '2026-10-02', '2026-10-01')).rejects.toBeInstanceOf(BadRequestException);
  });
});
