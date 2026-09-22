import { BadRequestException } from '@nestjs/common';
import { CalendarService, MAX_CALENDAR_RANGE_DAYS } from '../src/calendar/calendar.service';

function setup() {
  const prisma = { reminder: { findMany: jest.fn() } };
  const goals = { list: jest.fn() };
  const service = new CalendarService(prisma as never, goals as never);
  return { service, prisma, goals };
}

describe('CalendarService', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date('2026-09-15T12:00:00.000Z')));
  afterEach(() => jest.useRealTimers());

  it('mantém o período padrão aproximado de 31 dias', async () => {
    const { service, prisma, goals } = setup();
    goals.list.mockResolvedValue([]);
    prisma.reminder.findMany.mockResolvedValue([]);

    const result = await service.list('user-a');

    expect(result.from).toBe('2026-09-15T12:00:00.000Z');
    expect(result.to).toBe('2026-10-16T12:00:00.000Z');
  });

  it('lista metas pelo prazo no intervalo mensal semiaberto', async () => {
    const { service, prisma, goals } = setup();
    goals.list.mockResolvedValue([]);
    prisma.reminder.findMany.mockResolvedValue([]);

    await service.list('user-a', '2026-09-01', '2026-10-01');

    expect(goals.list).toHaveBeenCalledWith('user-a', { deadlineFrom: '2026-09-01T00:00:00.000Z', deadlineTo: '2026-10-01T00:00:00.000Z', sort: 'deadline' });
    expect(prisma.reminder.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { targetUserId: 'user-a', status: 'pending', remindAt: { gte: new Date('2026-09-01T00:00:00.000Z'), lt: new Date('2026-10-01T00:00:00.000Z') } } }));
  });

  it('aceita um intervalo exatamente no teto de 366 dias', async () => {
    const { service, prisma, goals } = setup();
    goals.list.mockResolvedValue([]);
    prisma.reminder.findMany.mockResolvedValue([]);

    await expect(service.list('user-a', '2024-01-01', '2025-01-01')).resolves.toMatchObject({ from: '2024-01-01T00:00:00.000Z', to: '2025-01-01T00:00:00.000Z' });
    expect(MAX_CALENDAR_RANGE_DAYS).toBe(366);
  });

  it('rejeita intervalo acima do teto operacional', async () => {
    const { service } = setup();
    await expect(service.list('user-a', '2024-01-01', '2025-01-02')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita intervalo vazio ou invertido', async () => {
    const { service } = setup();
    await expect(service.list('user-a', 'data-invalida', '2026-10-01')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.list('user-a', '2026-10-01', '2026-10-01')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.list('user-a', '2026-10-02', '2026-10-01')).rejects.toBeInstanceOf(BadRequestException);
  });
});
