import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGoalDto, CreateStepDto, ListGoalsQueryDto, OverrideGoalDto, ProgressDto, ReorderStepsDto, UpdateGoalDto, UpdateMemberRoleDto, UpdateStepDto } from './goals.dto';
import { ActivityService } from '../activity/activity.service';
import { publicAvatar, publicIdentity } from '../auth/user.serializer';

const EDITABLE_ROLES = new Set(['admin', 'editor']);
const MANAGE_ROLES = new Set(['admin']);
const MEMBER_ROLES = new Set(['admin', 'editor', 'viewer']);
export const STEP_ASSIGNMENT_MODES = ['ALL_PARTICIPANTS', 'SPECIFIC_PARTICIPANT'] as const;
export type StepAssignmentMode = (typeof STEP_ASSIGNMENT_MODES)[number];

type ProgressRecord = { userId: string; completed: boolean; completedAt?: Date | null };
type ParticipantSource = {
  ownerUserId: string;
  members?: Array<{ userId: string }>;
  team?: { ownerUserId: string; members?: Array<{ userId: string }> } | null;
};
type ParticipantUser = { id: string; name: string; avatarUrl: string | null; avatarType?: string | null; avatarPresetId?: string | null; avatarFileKey?: string | null };
type ParticipantMember = { userId: string; role: string; user: ParticipantUser };
type GoalStepRecord = { id: string; title: string; description?: string | null; position: number; assignmentMode?: string | null; assigneeUserId?: string | null; assigneeName?: string | null; assigneeUser?: ParticipantUser | null; progresses?: ProgressRecord[] };
type ParticipantProgressGoal = ParticipantSource & {
  owner?: ParticipantUser | null;
  members: ParticipantMember[];
  team?: ({ ownerUserId: string; owner?: ParticipantUser | null; members: ParticipantMember[] } | null);
  steps: GoalStepRecord[];
};
function sanitizeUserRelations<T>(value: T): T { if (!value || typeof value !== 'object') return value; const record = value as Record<string, unknown>; if (typeof record.id === 'string' && typeof record.name === 'string' && typeof record.email === 'string') return publicIdentity(record as { id: string; name: string; email: string; avatarUrl?: string | null; avatarType?: string | null; avatarPresetId?: string | null; avatarFileKey?: string | null }) as T; const result = { ...record }; if ('owner' in result) result.owner = sanitizeUserRelations(result.owner); if ('user' in result) result.user = sanitizeUserRelations(result.user); if (Array.isArray(result.members)) result.members = result.members.map((member) => sanitizeUserRelations(member)); if ('team' in result && result.team) result.team = sanitizeUserRelations(result.team); return result as T; }

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

  private participantIds(goal: ParticipantSource) {
    const participantIds = new Set<string>([goal.ownerUserId]);
    for (const member of goal.members ?? []) participantIds.add(member.userId);
    if (goal.team) {
      participantIds.add(goal.team.ownerUserId);
      for (const member of goal.team.members ?? []) participantIds.add(member.userId);
    }
    return participantIds;
  }

  private assignmentMode(step: Pick<GoalStepRecord, 'assignmentMode'>): StepAssignmentMode {
    return step.assignmentMode === 'SPECIFIC_PARTICIPANT' ? 'SPECIFIC_PARTICIPANT' : 'ALL_PARTICIPANTS';
  }

  private stepAppliesTo(step: Pick<GoalStepRecord, 'assignmentMode' | 'assigneeUserId'>, userId: string, participantIds: Set<string>) {
    if (!participantIds.has(userId)) return false;
    return this.assignmentMode(step) === 'ALL_PARTICIPANTS' || step.assigneeUserId === userId;
  }

  private stepHasUnavailableAssignee(step: Pick<GoalStepRecord, 'assignmentMode' | 'assigneeUserId'>, participantIds: Set<string>) {
    return this.assignmentMode(step) === 'SPECIFIC_PARTICIPANT' && (!step.assigneeUserId || !participantIds.has(step.assigneeUserId));
  }

  private serializeStep(step: GoalStepRecord, participantIds: Set<string>, userId?: string) {
    const assignmentMode = this.assignmentMode(step);
    const assignee = step.assigneeUser ? { id: step.assigneeUser.id, name: step.assigneeUser.name, avatarUrl: step.assigneeUser.avatarUrl ?? null, avatar: publicAvatar(step.assigneeUser) } : null;
    const assigneeName = step.assigneeName ?? step.assigneeUser?.name ?? null;
    const applicable = userId ? this.stepAppliesTo(step, userId, participantIds) : undefined;
    return {
      id: step.id,
      title: step.title,
      description: step.description ?? null,
      position: step.position,
      assignmentMode,
      assigneeUserId: step.assigneeUserId ?? null,
      assigneeName,
      assignee,
      assigneeAvailable: assignmentMode === 'ALL_PARTICIPANTS' || (!!step.assigneeUserId && participantIds.has(step.assigneeUserId)),
      ...(userId ? { applicable } : {}),
      progresses: step.progresses ?? [],
    };
  }

  private async assignmentData(userId: string, goal: ParticipantSource, dto: CreateStepDto | UpdateStepDto, current?: GoalStepRecord) {
    if (dto.assignmentMode === undefined && dto.assigneeUserId === undefined) return {};
    const mode = dto.assignmentMode ?? this.assignmentMode(current ?? { assignmentMode: 'ALL_PARTICIPANTS' });
    if (!STEP_ASSIGNMENT_MODES.includes(mode as StepAssignmentMode)) throw new BadRequestException('Invalid step assignment mode.');
    if (mode === 'ALL_PARTICIPANTS') {
      if (dto.assigneeUserId) throw new BadRequestException('A step assigned to everyone cannot have a specific participant.');
      return { assignmentMode: 'ALL_PARTICIPANTS', assigneeUserId: null, assigneeName: null };
    }
    const assigneeUserId = dto.assigneeUserId;
    if (!assigneeUserId) throw new BadRequestException('Choose a valid participant for this step.');
    if (!this.participantIds(goal).has(assigneeUserId)) throw new BadRequestException('The responsible person must participate in this goal.');
    const assignee = await this.prisma.user.findUnique({ where: { id: assigneeUserId }, select: { name: true } });
    if (!assignee) throw new BadRequestException('The responsible person was not found.');
    return { assignmentMode: 'SPECIFIC_PARTICIPANT', assigneeUserId, assigneeName: assignee.name };
  }

  private participantProgress(goal: ParticipantProgressGoal) {
    const participants = new Map<string, { user: ParticipantUser; role: string }>();
    const addParticipant = (user: ParticipantUser | undefined, role: string) => {
      if (!user) return;
      const current = participants.get(user.id);
      if (!current || role === 'owner') participants.set(user.id, { user, role });
    };
    addParticipant(goal.owner ?? undefined, 'owner');
    for (const member of goal.members) addParticipant(member.user, member.role);
    if (goal.team) {
      addParticipant(goal.team.owner ?? undefined, 'owner');
      for (const member of goal.team.members) addParticipant(member.user, member.role);
    }

    const applicableIds = this.participantIds(goal);
    const participantsInOrder = [...participants.entries()]
      .filter(([userId]) => applicableIds.has(userId))
      .sort(([, left], [, right]) => left.role === 'owner' && right.role !== 'owner' ? -1 : right.role === 'owner' && left.role !== 'owner' ? 1 : left.user.name.localeCompare(right.user.name, 'pt-BR'));
    const participantRows = participantsInOrder.map(([userId, participant]) => {
      const steps = goal.steps.filter((step) => this.stepAppliesTo(step, userId, applicableIds)).map((step) => {
        const progress = (step.progresses ?? []).find((entry) => entry.userId === userId);
        return { ...this.serializeStep(step, applicableIds, userId), completed: progress?.completed === true, completedAt: progress?.completed === true ? progress.completedAt ?? null : null };
      });
      const completedSteps = steps.filter((step) => step.completed).length;
      const totalSteps = steps.length;
      const percentage = totalSteps ? Math.round(completedSteps / totalSteps * 1000) / 10 : 0;
      return {
        userId,
        name: participant.user.name,
        avatarUrl: participant.user.avatarUrl ?? null,
        avatar: publicAvatar(participant.user),
        role: participant.role,
        completedSteps,
        totalSteps,
        percentage,
        completed: totalSteps > 0 && completedSteps === totalSteps,
        status: totalSteps === 0 ? 'not-started' : completedSteps === 0 ? 'not-started' : completedSteps === totalSteps ? 'completed' : percentage >= 75 ? 'nearly-complete' : 'in-progress',
        steps,
      };
    });
    const collectiveCompletedSteps = participantRows.reduce((sum, participant) => sum + participant.completedSteps, 0);
    const unavailableSteps = goal.steps.filter((step) => this.stepHasUnavailableAssignee(step, applicableIds)).length;
    const collectiveTotalSteps = participantRows.reduce((sum, participant) => sum + participant.totalSteps, 0) + unavailableSteps;
    return {
      totalParticipants: participantRows.length,
      participantsCompleted: unavailableSteps ? 0 : participantRows.filter((participant) => participant.completed).length,
      collectiveCompletedSteps,
      collectiveTotalSteps,
      collectivePercentage: collectiveTotalSteps ? Math.round(collectiveCompletedSteps / collectiveTotalSteps * 1000) / 10 : 0,
      unavailableSteps,
      participants: participantRows,
    };
  }

  private serialize<T extends ParticipantSource & { tagsJson: string; steps: Array<{ progresses?: ProgressRecord[] }> }>(goal: T, viewerUserId?: string) {
    const participantIds = this.participantIds(goal);
    const steps = goal.steps.map((step) => this.serializeStep(step as GoalStepRecord, participantIds, viewerUserId));
    const participantCount = participantIds.size;
    const applicableSteps = viewerUserId ? steps.filter((step) => this.stepAppliesTo(step, viewerUserId, participantIds)) : steps;
    const completedSteps = viewerUserId ? applicableSteps.filter((step) => step.progresses.some((progress) => progress.userId === viewerUserId && progress.completed)).length : steps.filter((step) => step.progresses.some((progress) => progress.completed)).length;
    const unavailableSteps = steps.filter((step) => !step.assigneeAvailable).length;
    const completedParticipants = participantCount && steps.length && !unavailableSteps
      ? [...participantIds].filter((userId) => steps.filter((step) => this.stepAppliesTo(step, userId, participantIds)).every((step) => step.progresses.some((progress) => progress.userId === userId && progress.completed))).length
      : 0;
    const { tagsJson, ...rest } = goal;
    return sanitizeUserRelations({ ...rest, steps, tags: JSON.parse(tagsJson || '[]') as string[], progressSummary: { completedSteps, totalSteps: viewerUserId ? applicableSteps.length : steps.length, participantCount, completedParticipants, unavailableSteps }, participantsProgress: undefined });
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
    const goals = await this.prisma.goal.findMany({ where: { AND: [this.accessWhere(userId), ...filters] }, include: { category: true, team: { include: { members: true } }, members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, avatarType: true, avatarPresetId: true, avatarFileKey: true } } } }, steps: { orderBy: { position: 'asc' }, include: { progresses: { where: { userId } }, assigneeUser: { select: { id: true, name: true, avatarUrl: true, avatarType: true, avatarPresetId: true, avatarFileKey: true } } } } }, orderBy: query.sort === 'name' ? { name: 'asc' } : query.sort === 'deadline' ? { endDate: 'asc' } : { updatedAt: 'desc' } });
    const serialized = goals.map((goal) => this.serialize(goal, userId));
    if (query.sort === 'progress-desc' || query.sort === 'progress-asc') serialized.sort((a, b) => { const aValue = a.progressSummary?.totalSteps ? Math.round(a.progressSummary.completedSteps / a.progressSummary.totalSteps * 100) : 0; const bValue = b.progressSummary?.totalSteps ? Math.round(b.progressSummary.completedSteps / b.progressSummary.totalSteps * 100) : 0; return query.sort === 'progress-desc' ? bValue - aValue : aValue - bValue; });
    return serialized;
  }

  async get(userId: string, goalId: string) {
    const goal = await this.prisma.goal.findFirst({ where: this.accessWhere(userId, goalId), include: { category: true, owner: { select: { id: true, name: true, email: true, avatarUrl: true, avatarType: true, avatarPresetId: true, avatarFileKey: true } }, team: { include: { owner: { select: { id: true, name: true, email: true, avatarUrl: true, avatarType: true, avatarPresetId: true, avatarFileKey: true } }, members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, avatarType: true, avatarPresetId: true, avatarFileKey: true } } } } } }, members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, avatarType: true, avatarPresetId: true, avatarFileKey: true } } } }, steps: { orderBy: { position: 'asc' }, include: { progresses: true, assigneeUser: { select: { id: true, name: true, avatarUrl: true, avatarType: true, avatarPresetId: true, avatarFileKey: true } } } } } });
    if (!goal) throw new NotFoundException('Goal not found.');
    const detailParticipants = goal.team || goal.members.length > 0;
    const steps = goal.steps.map((step) => ({ ...step, progresses: detailParticipants ? step.progresses : step.progresses.filter((progress) => progress.userId === userId) }));
    const serialized = this.serialize({ ...goal, steps }, userId);
    return detailParticipants ? { ...serialized, participantsProgress: this.participantProgress({ ...goal, steps }) } : serialized;
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

  async cancel(userId: string, goalId: string) { const access = await this.role(userId, goalId); if (access.role !== 'owner' && !MANAGE_ROLES.has(access.role)) throw new ForbiddenException('You cannot cancel this goal.'); await this.prisma.goal.update({ where: { id: goalId }, data: { status: 'cancelled' } }); await this.record(userId, 'goal_cancelled', { goalId }); return { cancelled: true }; }
  async hardDelete(userId: string, goalId: string) { const goal = await this.prisma.goal.findUnique({ where: { id: goalId }, select: { ownerUserId: true } }); if (!goal) throw new NotFoundException('Goal not found.'); if (goal.ownerUserId !== userId) throw new ForbiddenException('Only the goal owner can permanently delete this goal.'); try { await this.prisma.$transaction(async (tx) => { await tx.notification.deleteMany({ where: { goalId } }); await tx.goal.delete({ where: { id: goalId } }); }); } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') throw new NotFoundException('Goal not found.'); throw error; } return { deleted: true }; }
  async archive(userId: string, goalId: string) { const access = await this.role(userId, goalId); if (access.role !== 'owner' && !MANAGE_ROLES.has(access.role)) throw new ForbiddenException('Only the owner or an admin can archive this goal.'); await this.prisma.goal.update({ where: { id: goalId }, data: { status: 'archived' } }); await this.record(userId, 'goal_archived', { goalId }); return { archived: true }; }

  async addStep(userId: string, goalId: string, dto: CreateStepDto) { const access = await this.role(userId, goalId); if (access.role !== 'owner' && !EDITABLE_ROLES.has(access.role)) throw new ForbiddenException('You cannot edit steps.'); const last = await this.prisma.goalStep.aggregate({ where: { goalId }, _max: { position: true } }); const assignment = await this.assignmentData(userId, access.goal, dto); await this.prisma.goalStep.create({ data: { goalId, title: dto.title.trim(), description: dto.description?.trim() || undefined, position: (last._max.position ?? -1) + 1, ...assignment } }); await this.record(userId, 'step_created', { goalId }); return this.get(userId, goalId); }
  async updateStep(userId: string, goalId: string, stepId: string, dto: UpdateStepDto) { const access = await this.role(userId, goalId); if (access.role !== 'owner' && !EDITABLE_ROLES.has(access.role)) throw new ForbiddenException('You cannot edit steps.'); const step = await this.prisma.goalStep.findFirst({ where: { id: stepId, goalId } }); if (!step) throw new NotFoundException('Step not found.'); const assignment = await this.assignmentData(userId, access.goal, dto, step as GoalStepRecord); await this.prisma.goalStep.update({ where: { id: stepId }, data: { title: dto.title.trim(), description: dto.description?.trim() || null, ...assignment } }); await this.recalculate(goalId); await this.record(userId, 'step_updated', { goalId }); return this.get(userId, goalId); }
  async removeStep(userId: string, goalId: string, stepId: string) { const access = await this.role(userId, goalId); if (access.role !== 'owner' && !EDITABLE_ROLES.has(access.role)) throw new ForbiddenException('You cannot edit steps.'); const step = await this.prisma.goalStep.findFirst({ where: { id: stepId, goalId } }); if (!step) throw new NotFoundException('Step not found.'); await this.prisma.$transaction(async (tx) => { await tx.goalStep.delete({ where: { id: stepId } }); const rest = await tx.goalStep.findMany({ where: { goalId }, orderBy: { position: 'asc' } }); for (const [position, item] of rest.entries()) await tx.goalStep.update({ where: { id: item.id }, data: { position: position + 100000 } }); for (const [position, item] of rest.entries()) await tx.goalStep.update({ where: { id: item.id }, data: { position } }); }); await this.recalculate(goalId); await this.record(userId, 'step_deleted', { goalId }); return this.get(userId, goalId); }
  async reorderSteps(userId: string, goalId: string, dto: ReorderStepsDto) { const access = await this.role(userId, goalId); if (access.role !== 'owner' && !EDITABLE_ROLES.has(access.role)) throw new ForbiddenException('You cannot edit steps.'); const steps = await this.prisma.goalStep.findMany({ where: { goalId }, select: { id: true } }); if (steps.length !== dto.stepIds.length || new Set(dto.stepIds).size !== steps.length || steps.some((step) => !dto.stepIds.includes(step.id))) throw new BadRequestException('stepIds must contain each goal step exactly once.'); await this.prisma.$transaction(async (tx) => { for (const [index, id] of dto.stepIds.entries()) await tx.goalStep.update({ where: { id }, data: { position: index + 100000 } }); for (const [index, id] of dto.stepIds.entries()) await tx.goalStep.update({ where: { id }, data: { position: index } }); }); await this.record(userId, 'steps_reordered', { goalId }); return this.get(userId, goalId); }
  async setProgress(userId: string, goalId: string, stepId: string, dto: ProgressDto) { const access = await this.role(userId, goalId); const step = await this.prisma.goalStep.findFirst({ where: { id: stepId, goalId } }); if (!step) throw new NotFoundException('Step not found.'); const participantIds = this.participantIds(access.goal); if (!this.stepAppliesTo(step as GoalStepRecord, userId, participantIds)) throw new ForbiddenException('Only the responsible participant can update this step.'); await this.prisma.goalStepProgress.upsert({ where: { goalStepId_userId: { goalStepId: stepId, userId } }, update: { completed: dto.completed, completedAt: dto.completed ? new Date() : null }, create: { goalStepId: stepId, userId, completed: dto.completed, completedAt: dto.completed ? new Date() : null } }); await this.record(userId, dto.completed ? 'step_completed' : 'step_uncompleted', { goalId }, { stepId }); await this.recalculate(goalId); return this.get(userId, goalId); }

  async recalculate(goalId: string) { const goal = await this.prisma.goal.findUnique({ where: { id: goalId }, include: { steps: { include: { progresses: true } }, members: true, team: { include: { members: true } } } }); if (!goal || goal.status !== 'active' || goal.steps.length === 0) return; const participants = this.participantIds(goal); if (goal.steps.some((step) => this.stepHasUnavailableAssignee(step as GoalStepRecord, participants))) return; const complete = [...participants].every((userId) => goal.steps.filter((step) => this.stepAppliesTo(step as GoalStepRecord, userId, participants)).every((step) => step.progresses.some((progress) => progress.userId === userId && progress.completed))); if (complete) await this.prisma.goal.update({ where: { id: goalId }, data: { status: 'completed', completedAt: new Date(), completionMode: 'automatic', completedByUserId: goal.ownerUserId } }); }
  async override(userId: string, goalId: string, dto: OverrideGoalDto) { const goal = await this.prisma.goal.findFirst({ where: { id: goalId, ownerUserId: userId } }); if (!goal) throw new ForbiddenException('Only the goal owner can override completion.'); await this.prisma.$transaction([this.prisma.goal.update({ where: { id: goalId }, data: { status: 'completed', completedAt: new Date(), completionMode: 'owner_override', completedByUserId: userId, completionOverrideReason: dto.reason?.trim() || null } }), this.prisma.goalAuditEvent.create({ data: { goalId, actorUserId: userId, eventType: 'owner_override', reason: dto.reason?.trim() || null } })]); await this.record(userId, 'goal_owner_override', { goalId }, { reason: dto.reason?.trim() || '' }); return this.get(userId, goalId); }
  async getRole(userId: string, goalId: string) { const access = await this.role(userId, goalId); return access.role; }
  async rhythm(userId: string, goalId: string) {
    const goal = await this.get(userId, goalId); const now = Date.now(); const start = new Date(goal.startDate).valueOf(); const end = goal.endDate ? new Date(goal.endDate).valueOf() : 0;
    const applicableSteps = goal.steps.filter((step) => this.stepAppliesTo(step, userId, this.participantIds(goal)));
    if (!end || !applicableSteps.length) return { applicable: false, state: 'unavailable', reason: 'A meta precisa ter início, prazo e pelo menos um passo aplicável.' };
    const elapsed = Math.min(100, Math.max(0, (now - start) / Math.max(1, end - start) * 100)); const done = applicableSteps.filter((step) => step.progresses?.some((progress) => progress.userId === userId && progress.completed)).length; const progress = done / applicableSteps.length * 100; const state = goal.status === 'completed' ? 'completed' : now > end && progress < 100 ? 'late' : progress >= elapsed + 10 ? 'ahead' : progress + 10 < elapsed ? 'attention' : 'on-track';
    return { applicable: true, state, timePercent: Math.round(elapsed), progressPercent: Math.round(progress), delta: Math.round(progress - elapsed) };
  }
  async updateMemberRole(userId: string, goalId: string, memberId: string, dto: UpdateMemberRoleDto) { const access = await this.role(userId, goalId); if (access.role !== 'owner' && !MANAGE_ROLES.has(access.role)) throw new ForbiddenException('You cannot manage goal members.'); if (!MEMBER_ROLES.has(dto.role)) throw new BadRequestException('Invalid role.'); const member = await this.prisma.goalMember.findFirst({ where: { id: memberId, goalId } }); if (!member) throw new NotFoundException('Member not found.'); if (access.role !== 'owner' && dto.role === 'admin') throw new ForbiddenException('Only the owner can assign admin.'); await this.prisma.goalMember.update({ where: { id: memberId }, data: { role: dto.role } }); await this.record(userId, 'goal_member_role_updated', { goalId, targetUserId: member.userId }, { role: dto.role }); return this.get(userId, goalId); }
  async removeMember(userId: string, goalId: string, memberId: string) { const access = await this.role(userId, goalId); if (access.role !== 'owner' && !MANAGE_ROLES.has(access.role)) throw new ForbiddenException('You cannot manage goal members.'); const member = await this.prisma.goalMember.findFirst({ where: { id: memberId, goalId } }); if (!member) throw new NotFoundException('Member not found.'); await this.prisma.goalMember.delete({ where: { id: memberId } }); await this.record(userId, 'goal_member_removed', { goalId, targetUserId: member.userId }); await this.recalculate(goalId); return this.get(userId, goalId); }
  async assertCanManageMembers(userId: string, goalId: string) { const access = await this.role(userId, goalId); if (access.role !== 'owner' && !MANAGE_ROLES.has(access.role)) throw new ForbiddenException('You cannot manage goal members.'); return access.goal; }
}
