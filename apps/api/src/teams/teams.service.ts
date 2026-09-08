import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto, CreateTeamWithGoalDto, UpdateTeamDto, UpdateMemberRoleDto } from './teams.dto';
import { GoalsService } from '../goals/goals.service';
import { ActivityService } from '../activity/activity.service';
import { publicIdentity } from '../auth/user.serializer';
import { TeamImageStorage } from './team-image-storage';

const MEMBER_ROLES = new Set(['admin', 'editor', 'viewer']);
export const MAX_TEAM_IMAGE_BYTES = 5 * 1024 * 1024;
export const TEAM_IMAGE_STORAGE = Symbol('TEAM_IMAGE_STORAGE');
const MAX_TEAM_IMAGE_SIDE = 10000;
const MAX_TEAM_IMAGE_PIXELS = 40_000_000;
const TEAM_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);
  constructor(private readonly prisma: PrismaService, private readonly goals: GoalsService, private readonly activity: ActivityService, @Inject(TEAM_IMAGE_STORAGE) private readonly imageStorage: TeamImageStorage) {}

  private serializeTeam<T extends { id: string; imageFileKey?: string | null; avatarUrl?: string | null }>(team: T, extras: Record<string, unknown> = {}) {
    const { imageFileKey, ...publicTeam } = team;
    const imageUrl = imageFileKey ? `/teams/${encodeURIComponent(team.id)}/image` : team.avatarUrl ?? null;
    return { ...publicTeam, imageUrl, ...extras };
  }

  private async access(userId: string, teamId: string) {
    const team = await this.prisma.team.findFirst({ where: { id: teamId, OR: [{ ownerUserId: userId }, { members: { some: { userId } } }] }, include: { members: true } });
    if (!team) throw new ForbiddenException('You do not have access to this team.');
    const member = team.members.find((entry) => entry.userId === userId);
    return { team, role: team.ownerUserId === userId ? 'owner' : member?.role ?? 'viewer' };
  }

  async list(userId: string) {
    const teams = await this.prisma.team.findMany({ where: { OR: [{ ownerUserId: userId }, { members: { some: { userId } } }] }, include: { owner: { select: { id: true, name: true, email: true, avatarUrl: true, avatarType: true, avatarPresetId: true, avatarFileKey: true } }, members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, avatarType: true, avatarPresetId: true, avatarFileKey: true } } } }, goals: { where: { status: { not: 'cancelled' } }, select: { id: true, name: true, status: true } } }, orderBy: { updatedAt: 'desc' } });
    return teams.map((team) => this.serializeTeam({ ...team, owner: team.owner ? publicIdentity(team.owner) : null, members: team.members.map((member) => ({ ...member, user: publicIdentity(member.user) })) }));
  }

  async get(userId: string, teamId: string) {
    const access = await this.access(userId, teamId);
    const team = await this.prisma.team.findFirst({ where: { id: teamId, OR: [{ ownerUserId: userId }, { members: { some: { userId } } }] }, include: { owner: { select: { id: true, name: true, email: true, avatarUrl: true, avatarType: true, avatarPresetId: true, avatarFileKey: true } }, members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, avatarType: true, avatarPresetId: true, avatarFileKey: true } } } }, goals: { where: { status: { not: 'cancelled' } }, select: { id: true } } } });
    if (!team) throw new ForbiddenException('You do not have access to this team.');
    const goals = await Promise.all(team.goals.map((goal) => this.goals.get(userId, goal.id)));
    return this.serializeTeam({ ...team, owner: team.owner ? publicIdentity(team.owner) : null, members: team.members.map((member) => ({ ...member, user: publicIdentity(member.user) })) }, { accessRole: access.role, goals });
  }

  async create(userId: string, dto: CreateTeamDto) { const team = await this.prisma.team.create({ data: { ownerUserId: userId, name: dto.name.trim(), description: dto.description?.trim() || undefined } }); await this.activity.record(userId, 'team_created', { teamId: team.id }); return this.get(userId, team.id); }

  async createWithGoal(userId: string, dto: CreateTeamWithGoalDto) {
    const startDate = new Date(dto.startDate); const endDate = dto.endDate ? new Date(dto.endDate) : undefined;
    if (Number.isNaN(startDate.valueOf()) || (endDate && Number.isNaN(endDate.valueOf()))) throw new BadRequestException('Invalid goal date.');
    if (endDate && endDate < startDate) throw new BadRequestException('End date must be on or after start date.');
    const customCategory = dto.customCategory?.trim() || undefined;
    if (dto.categoryId && customCategory) throw new BadRequestException('Choose a standard category or a custom category, not both.');
    const tags: string[] = []; const normalized = new Set<string>();
    for (const raw of dto.tags ?? []) { const tag = raw.trim(); const key = tag.toLocaleLowerCase(); if (!tag || normalized.has(key) || tag.length > 30) throw new BadRequestException('Tags must be non-empty, unique and at most 30 characters.'); normalized.add(key); tags.push(tag); }
    const stepTitles = (dto.stepTitles ?? []).map((title) => title.trim());
    if (stepTitles.some((title) => !title || title.length > 200)) throw new BadRequestException('Step titles must be non-empty and at most 200 characters.');
    const result = await this.prisma.$transaction(async (tx) => {
      const team = await tx.team.create({ data: { ownerUserId: userId, name: dto.name.trim(), description: dto.description?.trim() || undefined } });
      const goal = await tx.goal.create({ data: { ownerUserId: userId, teamId: team.id, name: dto.goalName.trim(), description: dto.goalDescription?.trim() || undefined, categoryId: dto.categoryId, customCategory, tagsJson: JSON.stringify(tags), startDate, endDate } });
      for (const [position, title] of stepTitles.entries()) await tx.goalStep.create({ data: { goalId: goal.id, title, position } });
      return goal;
    });
    await this.activity.record(userId, 'team_created', { teamId: result.teamId! }, { withGoal: true });
    await this.activity.record(userId, 'goal_created', { goalId: result.id, teamId: result.teamId! });
    return this.get(userId, result.teamId!);
  }

  async update(userId: string, teamId: string, dto: UpdateTeamDto) { const access = await this.access(userId, teamId); if (access.role !== 'owner' && access.role !== 'admin') throw new ForbiddenException('You cannot edit this team.'); await this.prisma.team.update({ where: { id: teamId }, data: { name: dto.name.trim(), description: dto.description?.trim() || null } }); await this.activity.record(userId, 'team_updated', { teamId }); return this.get(userId, teamId); }
  async uploadImage(userId: string, teamId: string, file: { buffer: Buffer; size: number; mimetype: string }) {
    const access = await this.access(userId, teamId);
    if (access.role !== 'owner' && access.role !== 'admin') throw new ForbiddenException('You cannot edit this team.');
    if (!file || !Buffer.isBuffer(file.buffer)) throw new BadRequestException('An image file is required.');
    if (file.size > MAX_TEAM_IMAGE_BYTES || file.buffer.byteLength > MAX_TEAM_IMAGE_BYTES) throw new BadRequestException('The image must be at most 5 MB.');
    if (!TEAM_IMAGE_MIME_TYPES.has(file.mimetype.toLowerCase())) throw new BadRequestException('Use a JPEG, PNG or WebP image.');
    const metadata = await sharp(file.buffer, { failOn: 'error', animated: false }).metadata().catch(() => { throw new BadRequestException('The image is invalid or malformed.'); });
    if (!metadata.width || !metadata.height || !metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format) || metadata.width > MAX_TEAM_IMAGE_SIDE || metadata.height > MAX_TEAM_IMAGE_SIDE || metadata.width * metadata.height > MAX_TEAM_IMAGE_PIXELS || (metadata.pages ?? 1) > 1) throw new BadRequestException('The image dimensions or format are not supported.');
    const processed = await sharp(file.buffer, { failOn: 'error' }).rotate().resize(512, 512, { fit: 'cover', position: 'centre' }).webp({ quality: 86 }).toBuffer().catch(() => { throw new BadRequestException('The image could not be processed.'); });
    let newKey: string | undefined;
    try {
      newKey = await this.imageStorage.save(teamId, processed);
      await this.prisma.team.update({ where: { id: teamId }, data: { imageFileKey: newKey } });
      await this.removeOldImage(access.team.imageFileKey);
      return this.get(userId, teamId);
    } catch (error) {
      if (newKey) await this.imageStorage.delete(newKey).catch(() => undefined);
      throw error;
    }
  }
  async removeImage(userId: string, teamId: string) {
    const access = await this.access(userId, teamId);
    if (access.role !== 'owner' && access.role !== 'admin') throw new ForbiddenException('You cannot edit this team.');
    await this.prisma.team.update({ where: { id: teamId }, data: { imageFileKey: null } });
    await this.removeOldImage(access.team.imageFileKey);
    return this.get(userId, teamId);
  }
  async readImage(userId: string, teamId: string) {
    const { team } = await this.access(userId, teamId);
    if (!team.imageFileKey || !team.imageFileKey.startsWith(`${teamId}/`)) throw new NotFoundException('Team image not found.');
    return this.imageStorage.read(team.imageFileKey).catch(() => { throw new NotFoundException('Team image not found.'); });
  }
  private async removeOldImage(key?: string | null) { if (!key) return; await this.imageStorage.delete(key).catch((error: unknown) => this.logger.warn(`Could not remove previous team image: ${(error as Error).message}`)); }
  async remove(userId: string, teamId: string) { const access = await this.access(userId, teamId); if (access.role !== 'owner') throw new ForbiddenException('Only the team owner can remove it.'); const imageFileKey = access.team.imageFileKey; await this.activity.record(userId, 'team_deleted', { teamId }); await this.prisma.team.delete({ where: { id: teamId } }); await this.removeOldImage(imageFileKey); return { deleted: true }; }
  async updateMember(userId: string, teamId: string, memberId: string, dto: UpdateMemberRoleDto) { const access = await this.access(userId, teamId); if (access.role !== 'owner' && access.role !== 'admin') throw new ForbiddenException('You cannot manage team members.'); if (!MEMBER_ROLES.has(dto.role)) throw new BadRequestException('Invalid role.'); const member = access.team.members.find((entry) => entry.id === memberId); if (!member) throw new NotFoundException('Member not found.'); if (member.userId === access.team.ownerUserId) throw new ForbiddenException('The team owner cannot be changed.'); if (access.role !== 'owner' && dto.role === 'admin') throw new ForbiddenException('Only the owner can assign admin.'); await this.prisma.teamMember.update({ where: { id: memberId }, data: { role: dto.role } }); await this.activity.record(userId, 'team_member_role_updated', { teamId, targetUserId: member.userId }, { role: dto.role }); return this.get(userId, teamId); }
  async removeMember(userId: string, teamId: string, memberId: string) { const access = await this.access(userId, teamId); if (access.role !== 'owner' && access.role !== 'admin') throw new ForbiddenException('You cannot manage team members.'); const member = access.team.members.find((entry) => entry.id === memberId); if (!member) throw new NotFoundException('Member not found.'); await this.prisma.teamMember.delete({ where: { id: memberId } }); await this.activity.record(userId, 'team_member_removed', { teamId, targetUserId: member.userId }); const goals = await this.prisma.goal.findMany({ where: { teamId, status: 'active' }, select: { id: true } }); await Promise.all(goals.map((goal) => this.goals.recalculate(goal.id))); return this.get(userId, teamId); }
}
