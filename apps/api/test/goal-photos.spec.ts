import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import sharp from 'sharp';
import { GoalsService } from '../src/goals/goals.service';

function storage() {
  return { save: jest.fn(async (_goalId: string, variant: string) => `${variant}-file.webp`), read: jest.fn(), delete: jest.fn(async () => undefined) };
}

function basePrisma() {
  const goal = { findUnique: jest.fn(), findFirst: jest.fn() };
  return {
    goal,
    goalPhoto: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), delete: jest.fn() },
    goalStep: { findFirst: jest.fn() },
    goalDailyOccurrence: { upsert: jest.fn() },
    $transaction: jest.fn(),
  };
}

async function jpeg() { return sharp({ create: { width: 20, height: 20, channels: 3, background: { r: 80, g: 120, b: 90 } } }).jpeg().toBuffer(); }

describe('GoalsService gallery', () => {
  it('creates a photo with a separate thumbnail and returns scoped media URLs', async () => {
    const prisma = basePrisma(); const files = storage(); const service = new GoalsService(prisma as never, undefined, files as never);
    prisma.goal.findUnique.mockResolvedValue({ id: 'goal-a', ownerUserId: 'owner', status: 'active', recurrenceType: 'NONE', members: [], team: null });
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma));
    prisma.goalPhoto.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...data, id: 'photo-a', createdAt: new Date(), author: { id: 'owner', name: 'Owner', avatarUrl: null }, goalStep: null, dailyOccurrence: null }));

    const result = await service.addPhoto('owner', 'goal-a', { title: 'Primeira memória', description: 'Um registro do avanço.' }, { buffer: await jpeg(), size: 100, mimetype: 'image/jpeg' } as Express.Multer.File);

    expect(files.save).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ id: 'photo-a', thumbnailUrl: '/goals/goal-a/photos/photo-a/thumbnail', imageUrl: '/goals/goal-a/photos/photo-a/image', canDelete: true });
    expect(prisma.goalPhoto.create.mock.calls[0][0].data).toMatchObject({ quotaScopeKey: 'goal-a:general:gallery', quotaSlot: 1 });
  });

  it('does not allow a non-assignee to publish on a specific participant step', async () => {
    const prisma = basePrisma(); const files = storage(); const service = new GoalsService(prisma as never, undefined, files as never);
    prisma.goal.findUnique.mockResolvedValue({ id: 'goal-a', ownerUserId: 'owner', status: 'active', recurrenceType: 'NONE', members: [{ userId: 'viewer', role: 'viewer' }], team: null });
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma));
    prisma.goalStep.findFirst.mockResolvedValue({ id: 'step-a', title: 'Passo', assignmentMode: 'SPECIFIC_PARTICIPANT', assigneeUserId: 'owner' });

    await expect(service.addPhoto('viewer', 'goal-a', { title: 'Tentativa', description: 'Descrição', goalStepId: 'step-a' }, { buffer: await jpeg(), size: 100, mimetype: 'image/jpeg' } as Express.Multer.File)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.goalPhoto.create).not.toHaveBeenCalled();
    expect(files.delete).toHaveBeenCalledTimes(2);
  });

  it('keeps quota allocation concurrency-safe through unique slots', async () => {
    const prisma = basePrisma(); const files = storage(); const service = new GoalsService(prisma as never, undefined, files as never);
    prisma.goal.findUnique.mockResolvedValue({ id: 'goal-a', ownerUserId: 'owner', status: 'active', recurrenceType: 'NONE', members: [], team: null });
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma));
    const conflict = () => { throw new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: '6.12.0' }); };
    prisma.goalPhoto.create.mockImplementation(conflict);

    await expect(service.addPhoto('owner', 'goal-a', { title: 'Quarta', description: 'Descrição' }, { buffer: await jpeg(), size: 100, mimetype: 'image/jpeg' } as Express.Multer.File)).rejects.toThrow('Você já publicou 3 fotos neste escopo.');
    expect(prisma.goalPhoto.create).toHaveBeenCalledTimes(3);
    expect(files.delete).toHaveBeenCalledTimes(2);
  });

  it('does not list photos from a goal outside the authenticated scope', async () => {
    const prisma = basePrisma(); const service = new GoalsService(prisma as never);
    prisma.goal.findUnique.mockResolvedValue({ id: 'private-goal', ownerUserId: 'another-user', members: [], team: null });
    await expect(service.listPhotos('user-a', 'private-goal', { limit: 24, offset: 0 })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.goalPhoto.findMany).not.toHaveBeenCalled();
  });
});
