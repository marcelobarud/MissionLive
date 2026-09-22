import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommentsService } from '../src/comments/comments.service';

const COMMENT_ID = 'comment-a';
const GOAL_ID = 'goal-a';

function setup(role: string = 'owner') {
  const comment = {
    id: COMMENT_ID, goalId: GOAL_ID, authorUserId: 'author-a', body: 'Originale', createdAt: new Date('2026-09-22T10:00:00Z'), updatedAt: new Date('2026-09-22T10:00:00Z'),
    author: { id: 'author-a', name: 'Autora', email: 'author@example.test', avatarUrl: null, avatarType: null, avatarPresetId: null, avatarFileKey: null, phone: '+15555550100' },
    reactions: [{ emoji: '👏', userId: 'user-a' }],
  };
  const prisma = {
    comment: {
      findMany: jest.fn().mockResolvedValue([comment]),
      findUnique: jest.fn().mockResolvedValue(comment),
      create: jest.fn().mockResolvedValue({ id: COMMENT_ID }),
      update: jest.fn().mockResolvedValue(comment),
      delete: jest.fn().mockResolvedValue(comment),
    },
    reaction: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'reaction-a' }), delete: jest.fn().mockResolvedValue({ id: 'reaction-a' }) },
  };
  const goals = { get: jest.fn().mockResolvedValue({ id: GOAL_ID }), getRole: jest.fn().mockResolvedValue(role) };
  const activity = { record: jest.fn().mockResolvedValue(undefined) };
  return { service: new CommentsService(prisma as never, goals as never, activity as never), prisma, goals, activity, comment };
}

describe('CommentsService authorization and isolation', () => {
  it('requires accessible goal scope before listing comments', async () => {
    const { service, prisma, goals } = setup();
    await service.list('user-a', GOAL_ID);
    expect(prisma.comment.findMany.mock.calls[0][0].where).toEqual({ goalId: GOAL_ID });
    goals.get.mockRejectedValueOnce(new NotFoundException());
    await expect(service.list('outsider', GOAL_ID)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.comment.findMany).toHaveBeenCalledTimes(1);
  });

  it('trims created content and returns only public author identity plus supported reactions', async () => {
    const { service, prisma, activity } = setup();
    const result = await service.create('user-a', GOAL_ID, '  Olá  ');
    expect(prisma.comment.create).toHaveBeenCalledWith({ data: { goalId: GOAL_ID, authorUserId: 'user-a', body: 'Olá' } });
    expect(result.author).not.toHaveProperty('phone');
    expect(result.reactions).toEqual(expect.arrayContaining([{ emoji: '👏', count: 1, reacted: true }]));
    expect(activity.record).toHaveBeenCalledWith('user-a', 'comment_created', { goalId: GOAL_ID });
  });

  it('allows the author to edit and delete, while a viewer cannot moderate another author', async () => {
    const author = setup('viewer');
    author.prisma.comment.findUnique.mockResolvedValue(author.comment);
    await author.service.update('author-a', COMMENT_ID, '  revisado  ');
    expect(author.prisma.comment.update).toHaveBeenCalledWith({ where: { id: COMMENT_ID }, data: { body: 'revisado' } });
    await author.service.remove('author-a', COMMENT_ID);
    expect(author.prisma.comment.delete).toHaveBeenCalledWith({ where: { id: COMMENT_ID } });

    const viewer = setup('viewer');
    await expect(viewer.service.update('user-a', COMMENT_ID, 'alteração')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(viewer.service.remove('user-a', COMMENT_ID)).rejects.toBeInstanceOf(ForbiddenException);
    expect(viewer.prisma.comment.update).not.toHaveBeenCalled();
    expect(viewer.prisma.comment.delete).not.toHaveBeenCalled();
  });

  it('allows owner/admin moderation but blocks users outside the goal from reacting', async () => {
    const admin = setup('admin');
    await admin.service.update('admin-a', COMMENT_ID, 'moderado');
    await admin.service.remove('admin-a', COMMENT_ID);
    const outsider = setup();
    outsider.goals.get.mockRejectedValue(new ForbiddenException());
    await expect(outsider.service.toggleReaction('outsider', COMMENT_ID, '👏')).rejects.toBeInstanceOf(ForbiddenException);
    expect(outsider.prisma.reaction.findFirst).not.toHaveBeenCalled();
  });

  it('toggles only supported reactions for an accessible comment', async () => {
    const { service, prisma, activity } = setup();
    await service.toggleReaction('user-a', COMMENT_ID, '🎉');
    expect(prisma.reaction.create).toHaveBeenCalledWith({ data: { commentId: COMMENT_ID, userId: 'user-a', emoji: '🎉' } });
    expect(activity.record).toHaveBeenCalledWith('user-a', 'reaction_added', { goalId: GOAL_ID }, { emoji: '🎉' });
    prisma.reaction.findFirst.mockResolvedValueOnce({ id: 'reaction-a' });
    await service.toggleReaction('user-a', COMMENT_ID, '🎉');
    expect(prisma.reaction.delete).toHaveBeenCalledWith({ where: { id: 'reaction-a' } });
    await expect(service.toggleReaction('user-a', COMMENT_ID, '<script>')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('applies the existing basic 30-write per-user window without waiting in real time', async () => {
    const { service } = setup();
    const now = Date.now();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(now);
    for (let index = 0; index < 30; index++) await service.create('user-a', GOAL_ID, `comentário ${index}`);
    await expect(service.create('user-a', GOAL_ID, 'limite excedido')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create('user-b', GOAL_ID, 'janela independente')).resolves.toMatchObject({ id: COMMENT_ID });
    clock.mockReturnValue(now + 60_001);
    await expect(service.create('user-a', GOAL_ID, 'janela renovada')).resolves.toMatchObject({ id: COMMENT_ID });
    clock.mockRestore();
  });
});
