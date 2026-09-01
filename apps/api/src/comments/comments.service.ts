import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoalsService } from '../goals/goals.service';
import { ActivityService } from '../activity/activity.service';

const EMOJIS = new Set(['👏', '❤️', '🎉', '💪']);

@Injectable()
export class CommentsService {
  private readonly writes = new Map<string, number[]>();
  constructor(private readonly prisma: PrismaService, private readonly goals: GoalsService, private readonly activity: ActivityService) {}

  private rateLimit(userId: string) {
    const now = Date.now(); const recent = (this.writes.get(userId) ?? []).filter((timestamp) => now - timestamp < 60_000);
    if (recent.length >= 30) throw new BadRequestException('Too many interactions. Try again shortly.');
    recent.push(now); this.writes.set(userId, recent);
  }

  private async serialize(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId }, include: { author: { select: { id: true, name: true } }, reactions: { select: { emoji: true, userId: true } } } });
    if (!comment) throw new NotFoundException('Comment not found.');
    const reactions = [...EMOJIS].map((emoji) => ({ emoji, count: comment.reactions.filter((reaction) => reaction.emoji === emoji).length, reacted: comment.reactions.some((reaction) => reaction.emoji === emoji && reaction.userId === userId) }));
    return { id: comment.id, body: comment.body, createdAt: comment.createdAt, updatedAt: comment.updatedAt, author: comment.author, reactions };
  }

  async list(userId: string, goalId: string, requestedLimit?: string) {
    await this.goals.get(userId, goalId);
    const parsed = Number(requestedLimit ?? 50); const limit = Number.isInteger(parsed) ? Math.min(Math.max(parsed, 1), 50) : 50;
    const comments = await this.prisma.comment.findMany({ where: { goalId }, select: { id: true }, orderBy: { createdAt: 'asc' }, take: limit });
    return Promise.all(comments.map((comment) => this.serialize(comment.id, userId)));
  }

  async create(userId: string, goalId: string, body: string) {
    this.rateLimit(userId); await this.goals.get(userId, goalId);
    const comment = await this.prisma.comment.create({ data: { goalId, authorUserId: userId, body: body.trim() } });
    await this.activity.record(userId, 'comment_created', { goalId }); return this.serialize(comment.id, userId);
  }

  async update(userId: string, commentId: string, body: string) {
    this.rateLimit(userId); const comment = await this.prisma.comment.findUnique({ where: { id: commentId } }); if (!comment) throw new NotFoundException('Comment not found.');
    const role = await this.goals.getRole(userId, comment.goalId); if (comment.authorUserId !== userId && role !== 'owner' && role !== 'admin') throw new ForbiddenException('You cannot edit this comment.');
    await this.prisma.comment.update({ where: { id: commentId }, data: { body: body.trim() } }); await this.activity.record(userId, 'comment_updated', { goalId: comment.goalId }); return this.serialize(commentId, userId);
  }

  async remove(userId: string, commentId: string) {
    this.rateLimit(userId); const comment = await this.prisma.comment.findUnique({ where: { id: commentId } }); if (!comment) throw new NotFoundException('Comment not found.');
    const role = await this.goals.getRole(userId, comment.goalId); if (comment.authorUserId !== userId && role !== 'owner' && role !== 'admin') throw new ForbiddenException('You cannot remove this comment.');
    await this.prisma.comment.delete({ where: { id: commentId } }); await this.activity.record(userId, 'comment_deleted', { goalId: comment.goalId }); return { deleted: true };
  }

  async toggleReaction(userId: string, commentId: string, emoji: string) {
    this.rateLimit(userId); if (!EMOJIS.has(emoji)) throw new BadRequestException('Unsupported reaction.');
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId }, select: { id: true, goalId: true } }); if (!comment) throw new NotFoundException('Comment not found.'); await this.goals.get(userId, comment.goalId);
    const existing = await this.prisma.reaction.findFirst({ where: { commentId, userId, emoji } });
    if (existing) await this.prisma.reaction.delete({ where: { id: existing.id } }); else await this.prisma.reaction.create({ data: { commentId, userId, emoji } });
    await this.activity.record(userId, existing ? 'reaction_removed' : 'reaction_added', { goalId: comment.goalId }, { emoji }); return this.serialize(commentId, userId);
  }
}
