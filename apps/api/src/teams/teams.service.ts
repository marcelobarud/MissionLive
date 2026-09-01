import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto, CreateTeamWithGoalDto, UpdateTeamDto, UpdateMemberRoleDto } from './teams.dto';
import { GoalsService } from '../goals/goals.service';

const MEMBER_ROLES = new Set(['admin', 'editor', 'viewer']);

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService, private readonly goals: GoalsService) {}

  private async access(userId: string, teamId: string) {
    const team = await this.prisma.team.findFirst({ where: { id: teamId, OR: [{ ownerUserId: userId }, { members: { some: { userId } } }] }, include: { members: true } });
    if (!team) throw new ForbiddenException('You do not have access to this team.');
    const member = team.members.find((entry) => entry.userId === userId);
    return { team, role: team.ownerUserId === userId ? 'owner' : member?.role ?? 'viewer' };
  }

  async list(userId: string) {
    return this.prisma.team.findMany({ where: { OR: [{ ownerUserId: userId }, { members: { some: { userId } } }] }, include: { owner: { select: { id: true, name: true, email: true } }, members: { include: { user: { select: { id: true, name: true, email: true } } } }, goals: { where: { status: { not: 'cancelled' } }, select: { id: true, name: true, status: true } } }, orderBy: { updatedAt: 'desc' } });
  }

  async get(userId: string, teamId: string) {
    const access = await this.access(userId, teamId);
    const team = await this.prisma.team.findFirst({ where: { id: teamId, OR: [{ ownerUserId: userId }, { members: { some: { userId } } }] }, include: { owner: { select: { id: true, name: true, email: true } }, members: { include: { user: { select: { id: true, name: true, email: true } } } }, goals: { where: { status: { not: 'cancelled' } }, select: { id: true } } } });
    if (!team) throw new ForbiddenException('You do not have access to this team.');
    const goals = await Promise.all(team.goals.map((goal) => this.goals.get(userId, goal.id)));
    return { ...team, accessRole: access.role, goals };
  }

  async create(userId: string, dto: CreateTeamDto) { const team = await this.prisma.team.create({ data: { ownerUserId: userId, name: dto.name.trim(), description: dto.description?.trim() || undefined } }); return this.get(userId, team.id); }

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
    return this.get(userId, result.teamId!);
  }

  async update(userId: string, teamId: string, dto: UpdateTeamDto) { const access = await this.access(userId, teamId); if (access.role !== 'owner' && access.role !== 'admin') throw new ForbiddenException('You cannot edit this team.'); await this.prisma.team.update({ where: { id: teamId }, data: { name: dto.name.trim(), description: dto.description?.trim() || null } }); return this.get(userId, teamId); }
  async remove(userId: string, teamId: string) { const access = await this.access(userId, teamId); if (access.role !== 'owner') throw new ForbiddenException('Only the team owner can remove it.'); await this.prisma.team.delete({ where: { id: teamId } }); return { deleted: true }; }
  async updateMember(userId: string, teamId: string, memberId: string, dto: UpdateMemberRoleDto) { const access = await this.access(userId, teamId); if (access.role !== 'owner' && access.role !== 'admin') throw new ForbiddenException('You cannot manage team members.'); if (!MEMBER_ROLES.has(dto.role)) throw new BadRequestException('Invalid role.'); const member = access.team.members.find((entry) => entry.id === memberId); if (!member) throw new NotFoundException('Member not found.'); if (member.userId === access.team.ownerUserId) throw new ForbiddenException('The team owner cannot be changed.'); if (access.role !== 'owner' && dto.role === 'admin') throw new ForbiddenException('Only the owner can assign admin.'); await this.prisma.teamMember.update({ where: { id: memberId }, data: { role: dto.role } }); return this.get(userId, teamId); }
  async removeMember(userId: string, teamId: string, memberId: string) { const access = await this.access(userId, teamId); if (access.role !== 'owner' && access.role !== 'admin') throw new ForbiddenException('You cannot manage team members.'); const member = access.team.members.find((entry) => entry.id === memberId); if (!member) throw new NotFoundException('Member not found.'); await this.prisma.teamMember.delete({ where: { id: memberId } }); const goals = await this.prisma.goal.findMany({ where: { teamId, status: 'active' }, select: { id: true } }); await Promise.all(goals.map((goal) => this.goals.recalculate(goal.id))); return this.get(userId, teamId); }
}
