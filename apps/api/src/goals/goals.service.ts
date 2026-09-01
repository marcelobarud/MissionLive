import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGoalDto, CreateStepDto, ListGoalsQueryDto, OverrideGoalDto, ProgressDto, ReorderStepsDto, UpdateGoalDto, UpdateMemberRoleDto, UpdateStepDto } from './goals.dto';
import { ActivityService } from '../activity/activity.service';

const EDITABLE_ROLES = new Set(['admin', 'editor']);
const MANAGE_ROLES = new Set(['admin']);
const MEMBER_ROLES = new Set(['admin', 'editor', 'viewer']);

type ProgressRecord = { userId: string; completed: boolean };
function progressPercent(steps: Array<{ progresses: ProgressRecord[] }>) { return steps.length ? Math.round(steps.filter((step) => step.progresses.some((progress) => progress.completed)).length / steps.length * 100) : 0; }

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService, @Optional() private readonly activity?: ActivityService) {}

  private async record(actorUserId: string, eventType: string, resource: { goalId?: string; teamId?: string; targetUserId?: string }, metadata?: Record<string, string | number | boolean>) { await this.activity?.record(actorUserId, eventType, resource, metadata); }

  private accessWhere(userId: string, goalId?: string) {
    return { ...(goalId ? { id: goalId } : {}), OR: [{ ownerUserId: userId }, { members: { some: { userId } } }, { team: { ownerUserId: userId } }, { team: { members: { some: { userId } } } }] };
  }

  private parseTags(tags: string[] | undefined) {
    const output: string[] = [];
    const normalized = new Set<string>();
    for (const raw of tags ?? []) {
      const tag = raw.trim(); const key = tag.toLocaleLowerCase();
      if (!tag || normalized.has(key)) throw new BadRequestException('Tags must be non-empty and unique.');
      if (tag.length > 30) throw new BadRequestException('Each tag must have at most 30 characters.');
      normalized.add(key); output.push(tag);
    }
    if (output.length > 10) throw new BadRequestException('A goal can have at most 10 tags.');
    return JSON.stringify(output);
  }

  private dates(dto: CreateGoalDto | UpdateGoalDto) {
    const startDate = new Date(dto.startDate); const endDate = dto.endDate ? new Date(dto.endDate) : undefined;
    if (Number.isNaN(startDate.valueOf()) || (endDate && Number.isNaN(endDate.valueOf()))) throw new BadRequestException('Invalid goal date.');
    if (endDate && endDate < startDate) throw new BadRequestException('End date must be on or after start date.');
    return { startDate, endDate };
  }

  private category(dto: CreateGoalDto | UpdateGoalDto) {
    const customCategory = dto.customCategory?.trim() || undefined;
    if (dto.categoryId && customCategory) throw new BadRequestException('Choose a standard category or a custom category, not both.');
    if (customCategory && (customCategory.length < 2 || customCategory.length > 60)) throw new BadRequestException('Custom category must have 2 to 60 characters.');
    return { categoryId: dto.categoryId, customCategory };
  }

  private serialize<T extends { tagsJson: string; steps: Array<{ progresses: ProgressRecord[] }> }>(goal: T) {
    const steps = goal.steps.map((step) => ({ ...step, progresses: step.progresses }));
    const participantIds = new Set<string>();
    if ('ownerUserId' in goal && typeof goal.ownerUserId === 'string') participantIds.add(goal.ownerUserId);
    if ('members' in goal && Array.isArray(goal.members)) for (const member of goal.members as Array<{ userId: string }>) participantIds.add(member.userId);
    if ('team' in goal && goal.team && typeof goal.team === 'object') {
      const team = goal.team as { ownerUserId?: string; members?: Array<{ userId: string }> };
      if (team.ownerUserId) participantIds.add(team.ownerUserId);
      for (const member of team.members ?? []) participantIds.add(member.userId);
    }
    const participantCount = participantIds.size;
    const completedParticipants = participantCount && steps.length ? [...participantIds].filter((userId) => steps.every((step) => step.progresses.some((progress) => progress.userId === userId && progress.completed))).length : 0;
    const completedSteps = steps.filter((step) => step.progresses.some((progress) => progress.completed)).length;
    const { tagsJson, ...rest } = goal;
    return { ...rest, steps, tags: JSON.parse(tagsJson || '[]') as string[], progressSummary: { completedSteps, totalSteps: steps.length, participantCount, completedParticipants } };
  }

  private async role(userId: string, goalId: string) {
    const goal = await this.prisma.goal.findUnique({ where: { id: goalId }, include: { members: true, team: { include: { members: true } } } });
    if (!goal) throw new NotFoundException('Goal not found.');
    if (goal.ownerUserId === userId) return { goal, role: 'owner' };
    if (goal.team) {
      if (goal.team.ownerUserId === userId) return { goal, role: 'owner' };
      const member = goal.team.members.find((entry) => entry.userId === userId);
      if (member) return { goal, role: member.role };
    }
    const member = goal.members.find((entry) => entry.userId === userId);
    if (member) return { goal, role: member.role };
    throw new ForbiddenException('You do not have access to this goal.');
  }

  async list(userId: string, query: ListGoalsQueryDto = {}) {
    const filters: Prisma.GoalWhereInput[] = [];
    if (query.status) filters.push({ status: query.status });
    if (query.categoryId) filters.push({ categoryId: query.categoryId });
    if (query.q) filters.push({ OR: [{ name: { contains: query.q } }, { description: { contains: query.q } }, { tagsJson: { contains: query.q } }] });
    if (query.hasDeadline !== undefined) filters.push({ endDate: query.hasDeadline ? { not: null } : null });
    if (query.from || query.to) filters.push({ startDate: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } });
    if (query.context === 'individual') filters.push({ teamId: null, members: { none: {} } });
    if (query.context === 'shared') filters.push({ teamId: null, members: { some: {} } });
    if (query.context === 'team') filters.push({ teamId: { not: null } });
    const goals = await this.prisma.goal.findMany({ where: { AND: [this.accessWhere(userId), ...filters] }, include: { category: true, team: true, members: { include: { user: { select: { id: true, name: true, email: true } } } }, steps: { orderBy: { position: 'asc' }, include: { progresses: { where: { userId } } } } }, orderBy: query.sort === 'name' ? { name: 'asc' } : query.sort === 'deadline' ? { endDate: 'asc' } : { updatedAt: 'desc' } });
    const serialized = goals.map((goal) => this.serialize(goal));
    if (query.sort === 'progress-desc' || query.sort === 'progress-asc') serialized.sort((a, b) => { const aValue = progressPercent(a.steps); const bValue = progressPercent(b.steps); return query.sort === 'progress-desc' ? bValue - aValue : aValue - bValue; });
    return serialized;
  }

  async get(userId: string, goalId: string) {
    const goal = await this.prisma.goal.findFirst({ where: this.accessWhere(userId, goalId), include: { category: true, owner: { select: { id: true, name: true, email: true } }, team: { include: { owner: { select: { id: true, name: true, email: true } }, members: { include: { user: { select: { id: true, name: true, email: true } } } } } }, members: { include: { user: { select: { id: true, name: true, email: true } } } }, steps: { orderBy: { position: 'asc' }, include: { progresses: true } } } });
    if (!goal) throw new NotFoundException('Goal not found.');
    const detailParticipants = goal.team || goal.members.length > 0;
    const steps = goal.steps.map((step) => ({ ...step, progresses: detailParticipants ? step.progresses : step.progresses.filter((progress) => progress.userId === userId) }));
    return this.serialize({ ...goal, steps });
  }

  async create(userId: string, dto: CreateGoalDto) {
    const { startDate, endDate } = this.dates(dto); const category = this.category(dto);
    if (dto.teamId) {
      const team = await this.prisma.team.findFirst({ where: { id: dto.teamId, OR: [{ ownerUserId: userId }, { members: { some: { userId, role: { in: ['admin', 'editor'] } } } }] } });
      if (!team) throw new ForbiddenException('You cannot create goals in this team.');
    }
    const goal = await this.prisma.goal.create({ data: { ownerUserId: userId, teamId: dto.teamId, name: dto.name.trim(), description: dto.description?.trim() || undefined, ...category, tagsJson: this.parseTags(dto.tags), startDate, endDate } });
    await this.record(userId, 'goal_created', { goalId: goal.id, teamId: goal.teamId ?? undefined });
    return this.get(userId, goal.id);
  }

  async update(userId: string, goalId: string, dto: UpdateGoalDto) {
    const access = await this.role(userId, goalId); if (access.role !== 'owner' && !EDITABLE_ROLES.has(access.role)) throw new ForbiddenException('You cannot edit this goal.');
    if (access.goal.teamId !== dto.teamId && dto.teamId !== undefined) throw new BadRequestException('A goal cannot change team context.');
    const { startDate, endDate } = this.dates(dto); const category = this.category(dto);
    await this.prisma.goal.update({ where: { id: goalId }, data: { name: dto.name.trim(), description: dto.description?.trim() || null, ...category, tagsJson: this.parseTags(dto.tags), startDate, endDate } });
    await this.record(userId, 'goal_updated', { goalId });
    await this.recalculate(goalId); return this.get(userId, goalId);
  }

  async remove(userId: string, goalId: string) { const access = await this.role(userId, goalId); if (access.role !== 'owner' && !MANAGE_ROLES.has(access.role)) throw new ForbiddenException('You cannot remove this goal.'); await this.prisma.goal.update({ where: { id: goalId }, data: { status: 'cancelled' } }); await this.record(userId, 'goal_cancelled', { goalId }); return { cancelled: true }; }
  async archive(userId: string, goalId: string) { const access = await this.role(userId, goalId); if (access.role !== 'owner' && !MANAGE_ROLES.has(access.role)) throw new ForbiddenException('Only the owner or an admin can archive this goal.'); await this.prisma.goal.update({ where: { id: goalId }, data: { status: 'archived' } }); await this.record(userId, 'goal_archived', { goalId }); return { archived: true }; }

  async addStep(userId: string, goalId: string, dto: CreateStepDto) { const access = await this.role(userId, goalId); if (access.role !== 'owner' && !EDITABLE_ROLES.has(access.role)) throw new ForbiddenException('You cannot edit steps.'); const last = await this.prisma.goalStep.aggregate({ where: { goalId }, _max: { position: true } }); await this.prisma.goalStep.create({ data: { goalId, title: dto.title.trim(), description: dto.description?.trim() || undefined, position: (last._max.position ?? -1) + 1 } }); await this.record(userId, 'step_created', { goalId }); return this.get(userId, goalId); }
  async updateStep(userId: string, goalId: string, stepId: string, dto: UpdateStepDto) { const access = await this.role(userId, goalId); if (access.role !== 'owner' && !EDITABLE_ROLES.has(access.role)) throw new ForbiddenException('You cannot edit steps.'); const step = await this.prisma.goalStep.findFirst({ where: { id: stepId, goalId } }); if (!step) throw new NotFoundException('Step not found.'); await this.prisma.goalStep.update({ where: { id: stepId }, data: { title: dto.title.trim(), description: dto.description?.trim() || null } }); await this.record(userId, 'step_updated', { goalId }); return this.get(userId, goalId); }
  async removeStep(userId: string, goalId: string, stepId: string) { const access = await this.role(userId, goalId); if (access.role !== 'owner' && !EDITABLE_ROLES.has(access.role)) throw new ForbiddenException('You cannot edit steps.'); const step = await this.prisma.goalStep.findFirst({ where: { id: stepId, goalId } }); if (!step) throw new NotFoundException('Step not found.'); await this.prisma.$transaction(async (tx) => { await tx.goalStep.delete({ where: { id: stepId } }); const rest = await tx.goalStep.findMany({ where: { goalId }, orderBy: { position: 'asc' } }); for (const [position, item] of rest.entries()) await tx.goalStep.update({ where: { id: item.id }, data: { position: position + 100000 } }); for (const [position, item] of rest.entries()) await tx.goalStep.update({ where: { id: item.id }, data: { position } }); }); await this.recalculate(goalId); await this.record(userId, 'step_deleted', { goalId }); return this.get(userId, goalId); }
  async reorderSteps(userId: string, goalId: string, dto: ReorderStepsDto) { const access = await this.role(userId, goalId); if (access.role !== 'owner' && !EDITABLE_ROLES.has(access.role)) throw new ForbiddenException('You cannot edit steps.'); const steps = await this.prisma.goalStep.findMany({ where: { goalId }, select: { id: true } }); if (steps.length !== dto.stepIds.length || new Set(dto.stepIds).size !== steps.length || steps.some((step) => !dto.stepIds.includes(step.id))) throw new BadRequestException('stepIds must contain each goal step exactly once.'); await this.prisma.$transaction(async (tx) => { for (const [index, id] of dto.stepIds.entries()) await tx.goalStep.update({ where: { id }, data: { position: index + 100000 } }); for (const [index, id] of dto.stepIds.entries()) await tx.goalStep.update({ where: { id }, data: { position: index } }); }); await this.record(userId, 'steps_reordered', { goalId }); return this.get(userId, goalId); }
  async setProgress(userId: string, goalId: string, stepId: string, dto: ProgressDto) { await this.role(userId, goalId); const step = await this.prisma.goalStep.findFirst({ where: { id: stepId, goalId } }); if (!step) throw new NotFoundException('Step not found.'); await this.prisma.goalStepProgress.upsert({ where: { goalStepId_userId: { goalStepId: stepId, userId } }, update: { completed: dto.completed, completedAt: dto.completed ? new Date() : null }, create: { goalStepId: stepId, userId, completed: dto.completed, completedAt: dto.completed ? new Date() : null } }); await this.record(userId, dto.completed ? 'step_completed' : 'step_uncompleted', { goalId }, { stepId }); await this.recalculate(goalId); return this.get(userId, goalId); }

  async recalculate(goalId: string) { const goal = await this.prisma.goal.findUnique({ where: { id: goalId }, include: { steps: { include: { progresses: true } }, members: true, team: { include: { members: true } } } }); if (!goal || goal.status !== 'active' || goal.steps.length === 0) return; const participants = new Set([goal.ownerUserId, ...goal.members.map((member) => member.userId), ...(goal.team ? [goal.team.ownerUserId, ...goal.team.members.map((member) => member.userId)] : [])]); const complete = [...participants].every((userId) => goal.steps.every((step) => step.progresses.some((progress) => progress.userId === userId && progress.completed))); if (complete) await this.prisma.goal.update({ where: { id: goalId }, data: { status: 'completed', completedAt: new Date(), completionMode: 'automatic', completedByUserId: goal.ownerUserId } }); }
  async override(userId: string, goalId: string, dto: OverrideGoalDto) { const goal = await this.prisma.goal.findFirst({ where: { id: goalId, ownerUserId: userId } }); if (!goal) throw new ForbiddenException('Only the goal owner can override completion.'); await this.prisma.$transaction([this.prisma.goal.update({ where: { id: goalId }, data: { status: 'completed', completedAt: new Date(), completionMode: 'owner_override', completedByUserId: userId, completionOverrideReason: dto.reason?.trim() || null } }), this.prisma.goalAuditEvent.create({ data: { goalId, actorUserId: userId, eventType: 'owner_override', reason: dto.reason?.trim() || null } })]); await this.record(userId, 'goal_owner_override', { goalId }, { reason: dto.reason?.trim() || '' }); return this.get(userId, goalId); }
  async getRole(userId: string, goalId: string) { const access = await this.role(userId, goalId); return access.role; }
  async updateMemberRole(userId: string, goalId: string, memberId: string, dto: UpdateMemberRoleDto) { const access = await this.role(userId, goalId); if (access.role !== 'owner' && !MANAGE_ROLES.has(access.role)) throw new ForbiddenException('You cannot manage goal members.'); if (!MEMBER_ROLES.has(dto.role)) throw new BadRequestException('Invalid role.'); const member = await this.prisma.goalMember.findFirst({ where: { id: memberId, goalId } }); if (!member) throw new NotFoundException('Member not found.'); if (access.role !== 'owner' && dto.role === 'admin') throw new ForbiddenException('Only the owner can assign admin.'); await this.prisma.goalMember.update({ where: { id: memberId }, data: { role: dto.role } }); await this.record(userId, 'goal_member_role_updated', { goalId, targetUserId: member.userId }, { role: dto.role }); return this.get(userId, goalId); }
  async removeMember(userId: string, goalId: string, memberId: string) { const access = await this.role(userId, goalId); if (access.role !== 'owner' && !MANAGE_ROLES.has(access.role)) throw new ForbiddenException('You cannot manage goal members.'); const member = await this.prisma.goalMember.findFirst({ where: { id: memberId, goalId } }); if (!member) throw new NotFoundException('Member not found.'); await this.prisma.goalMember.delete({ where: { id: memberId } }); await this.record(userId, 'goal_member_removed', { goalId, targetUserId: member.userId }); await this.recalculate(goalId); return this.get(userId, goalId); }
  async assertCanManageMembers(userId: string, goalId: string) { const access = await this.role(userId, goalId); if (access.role !== 'owner' && !MANAGE_ROLES.has(access.role)) throw new ForbiddenException('You cannot manage goal members.'); return access.goal; }
}
