import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityListQueryDto } from './activity.dto';
import { publicIdentity } from '../auth/user.serializer';

type Metadata = Record<string, string | number | boolean>;

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async record(actorUserId: string, eventType: string, resource: { goalId?: string; teamId?: string; targetUserId?: string }, metadata: Metadata = {}) {
    const event = await this.prisma.activityEvent.create({ data: { actorUserId, eventType, goalId: resource.goalId, teamId: resource.teamId, targetUserId: resource.targetUserId, metadataJson: JSON.stringify(metadata) } });
    const recipients = new Set<string>(resource.targetUserId ? [resource.targetUserId] : []);
    if (resource.goalId) {
      const goal = await this.prisma.goal.findUnique({ where: { id: resource.goalId }, select: { ownerUserId: true, members: { select: { userId: true } }, team: { select: { ownerUserId: true, members: { select: { userId: true } } } } } });
      if (goal) { recipients.add(goal.ownerUserId); goal.members.forEach((member) => recipients.add(member.userId)); if (goal.team) { recipients.add(goal.team.ownerUserId); goal.team.members.forEach((member) => recipients.add(member.userId)); } }
    } else if (resource.teamId) {
      const team = await this.prisma.team.findUnique({ where: { id: resource.teamId }, select: { ownerUserId: true, members: { select: { userId: true } } } });
      if (team) { recipients.add(team.ownerUserId); team.members.forEach((member) => recipients.add(member.userId)); }
    }
    const notify = [...recipients].filter((userId) => userId !== actorUserId);
    if (notify.length) await this.prisma.notification.createMany({ data: notify.map((userId) => ({ userId, type: eventType, title: 'Atualização em uma colaboração', body: `Você recebeu uma atualização de ${eventType.replaceAll('_', ' ')}.`, goalId: resource.goalId, teamId: resource.teamId })) });
    return event;
  }

  async list(userId: string, query: ActivityListQueryDto = {}) {
    const limit = query.limit ?? 25;
    const offset = query.offset ?? 0;
    const events = await this.prisma.activityEvent.findMany({ where: { OR: [{ goal: { OR: [{ ownerUserId: userId }, { members: { some: { userId } } }, { team: { ownerUserId: userId } }, { team: { members: { some: { userId } } } }] } }, { team: { OR: [{ ownerUserId: userId }, { members: { some: { userId } } }] } }] }, include: { actor: { select: { id: true, name: true, email: true, avatarUrl: true, avatarType: true, avatarPresetId: true, avatarFileKey: true } }, targetUser: { select: { id: true, name: true, email: true, avatarUrl: true, avatarType: true, avatarPresetId: true, avatarFileKey: true } }, goal: { select: { id: true, name: true } }, team: { select: { id: true, name: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: offset, take: limit + 1 });
    const hasMore = events.length > limit;
    const items = (hasMore ? events.slice(0, limit) : events).map((event) => ({ ...event, actor: event.actor ? publicIdentity(event.actor) : event.actor, targetUser: event.targetUser ? publicIdentity(event.targetUser) : null, metadata: JSON.parse(event.metadataJson || '{}') as Metadata }));
    return { items, nextOffset: hasMore ? offset + limit : null, hasMore };
  }
}
