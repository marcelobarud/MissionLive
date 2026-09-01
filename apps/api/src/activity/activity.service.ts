import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Metadata = Record<string, string | number | boolean>;

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async record(actorUserId: string, eventType: string, resource: { goalId?: string; teamId?: string; targetUserId?: string }, metadata: Metadata = {}) {
    return this.prisma.activityEvent.create({ data: { actorUserId, eventType, goalId: resource.goalId, teamId: resource.teamId, targetUserId: resource.targetUserId, metadataJson: JSON.stringify(metadata) } });
  }

  async list(userId: string, requestedLimit?: string) {
    const parsed = Number(requestedLimit ?? 30); const limit = Number.isInteger(parsed) ? Math.min(Math.max(parsed, 1), 50) : 30;
    const events = await this.prisma.activityEvent.findMany({ where: { OR: [{ goal: { OR: [{ ownerUserId: userId }, { members: { some: { userId } } }, { team: { ownerUserId: userId } }, { team: { members: { some: { userId } } } }] } }, { team: { OR: [{ ownerUserId: userId }, { members: { some: { userId } } }] } }] }, include: { actor: { select: { id: true, name: true } }, targetUser: { select: { id: true, name: true } }, goal: { select: { id: true, name: true } }, team: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: limit });
    return events.map((event) => ({ ...event, metadata: JSON.parse(event.metadataJson || '{}') as Metadata }));
  }
}
