import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TeamsService } from '../src/teams/teams.service';

const TEAM_ID = '11111111-1111-4111-8111-111111111111';
const OWNER_ID = 'owner-a';
type TeamFixture = { id: string; ownerUserId: string; name: string; description: string | null; avatarUrl: string | null; imageFileKey: string | null; owner: Record<string, unknown>; members: Array<Record<string, unknown>>; goals: Array<Record<string, unknown>> };

function setup(role: string = 'owner') {
  const owner = { id: OWNER_ID, name: 'Owner', email: 'owner@example.test', avatarUrl: null, avatarType: null, avatarPresetId: null, avatarFileKey: null };
  const memberUser = { id: 'user-a', name: 'Member', email: 'member@example.test', avatarUrl: null, avatarType: null, avatarPresetId: null, avatarFileKey: null };
  let current: TeamFixture = {
    id: TEAM_ID, ownerUserId: OWNER_ID, name: 'Equipe', description: null, avatarUrl: null, imageFileKey: null, owner,
    members: role === 'owner' ? [] : [{ id: 'member-a', teamId: TEAM_ID, userId: 'user-a', role, user: memberUser }], goals: [],
  };
  const prisma = {
    team: {
      findFirst: jest.fn().mockImplementation(async () => ({ ...current, members: [...current.members], goals: [...current.goals] })),
      findMany: jest.fn().mockImplementation(async () => [{ ...current, members: [...current.members], goals: [...current.goals] }]),
      create: jest.fn().mockImplementation(async ({ data }: { data: Partial<TeamFixture> }) => { current = { ...current, ...data }; return current; }),
      update: jest.fn().mockImplementation(async ({ data }: { data: Partial<TeamFixture> }) => { current = { ...current, ...data }; return current; }),
      delete: jest.fn().mockResolvedValue({ id: TEAM_ID }),
    },
    teamMember: {
      update: jest.fn().mockImplementation(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => { current.members = current.members.map((member) => member.id === where.id ? { ...member, ...data } : member); return {}; }),
      delete: jest.fn().mockImplementation(async ({ where }: { where: { id: string } }) => { current.members = current.members.filter((member) => member.id !== where.id); return {}; }),
    },
    goal: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const goals = { get: jest.fn(), recalculate: jest.fn().mockResolvedValue(undefined) };
  const activity = { record: jest.fn().mockResolvedValue(undefined) };
  const storage = { save: jest.fn(), read: jest.fn(), delete: jest.fn().mockResolvedValue(undefined) };
  return { service: new TeamsService(prisma as never, goals as never, activity as never, storage as never), prisma, goals, activity, storage, current: () => current };
}

describe('TeamsService authorization and membership', () => {
  it('scopes team listings and details to owner or team membership', async () => {
    const { service, prisma } = setup('viewer');
    await service.list('user-a');
    expect(prisma.team.findMany.mock.calls[0][0].where).toEqual({ OR: [{ ownerUserId: 'user-a' }, { members: { some: { userId: 'user-a' } } }] });
    await service.get('user-a', TEAM_ID);
    expect(prisma.team.findFirst.mock.calls[0][0].where).toEqual({ id: TEAM_ID, OR: [{ ownerUserId: 'user-a' }, { members: { some: { userId: 'user-a' } } }] });
    const outsider = setup();
    outsider.prisma.team.findFirst.mockResolvedValue(null);
    await expect(outsider.service.get('outsider', TEAM_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates teams for the authenticated owner and trims editable fields', async () => {
    const { service, prisma, activity } = setup();
    await service.create(OWNER_ID, { name: '  Nova equipe  ', description: '  Descrição  ' });
    expect(prisma.team.create).toHaveBeenCalledWith({ data: { ownerUserId: OWNER_ID, name: 'Nova equipe', description: 'Descrição' } });
    expect(activity.record).toHaveBeenCalledWith(OWNER_ID, 'team_created', { teamId: TEAM_ID });
  });

  it('allows an admin to edit, but not an editor or outsider', async () => {
    const admin = setup('admin');
    await admin.service.update('user-a', TEAM_ID, { name: '  Atualizada  ' });
    expect(admin.prisma.team.update).toHaveBeenCalledWith({ where: { id: TEAM_ID }, data: { name: 'Atualizada', description: null } });
    const editor = setup('editor');
    await expect(editor.service.update('user-a', TEAM_ID, { name: 'Proibida' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(editor.prisma.team.update).not.toHaveBeenCalled();
  });

  it('allows owner role changes while preserving owner and admin privilege boundaries', async () => {
    const owner = setup();
    owner.current().members.push({ id: 'member-a', userId: 'user-a', role: 'editor', user: { id: 'user-a', name: 'Member', email: 'member@example.test', avatarUrl: null } });
    await owner.service.updateMember(OWNER_ID, TEAM_ID, 'member-a', { role: 'viewer' });
    expect(owner.prisma.teamMember.update).toHaveBeenCalledWith({ where: { id: 'member-a' }, data: { role: 'viewer' } });
    await expect(owner.service.updateMember(OWNER_ID, TEAM_ID, 'owner-membership', { role: 'viewer' })).rejects.toBeInstanceOf(NotFoundException);

    const admin = setup('admin');
    await expect(admin.service.updateMember('user-a', TEAM_ID, 'member-a', { role: 'admin' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(admin.prisma.teamMember.update).not.toHaveBeenCalled();

    const ownerInMembers = setup();
    ownerInMembers.current().members.push({ id: 'owner-membership', userId: OWNER_ID, role: 'admin', user: { id: OWNER_ID, name: 'Owner', email: 'owner@example.test', avatarUrl: null } });
    await expect(ownerInMembers.service.updateMember(OWNER_ID, TEAM_ID, 'owner-membership', { role: 'viewer' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets an authorized admin remove a member and recalculates active team goals', async () => {
    const { service, prisma, goals } = setup('admin');
    prisma.goal.findMany.mockResolvedValue([{ id: 'goal-1' }, { id: 'goal-2' }]);
    await service.removeMember('user-a', TEAM_ID, 'member-a');
    expect(prisma.teamMember.delete).toHaveBeenCalledWith({ where: { id: 'member-a' } });
    expect(prisma.goal.findMany).toHaveBeenCalledWith({ where: { teamId: TEAM_ID, status: 'active' }, select: { id: true } });
    expect(goals.recalculate).toHaveBeenCalledTimes(2);
  });

  it('restricts team deletion to the owner', async () => {
    const admin = setup('admin');
    await expect(admin.service.remove('user-a', TEAM_ID)).rejects.toBeInstanceOf(ForbiddenException);
    expect(admin.prisma.team.delete).not.toHaveBeenCalled();
    const owner = setup();
    await expect(owner.service.remove(OWNER_ID, TEAM_ID)).resolves.toEqual({ deleted: true });
    expect(owner.prisma.team.delete).toHaveBeenCalledWith({ where: { id: TEAM_ID } });
  });
});
