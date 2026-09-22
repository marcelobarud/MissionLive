import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { hashToken } from '../src/auth/token.util';
import { InvitesService } from '../src/invites/invites.service';

const TOKEN = 'invite-token-for-tests-1234567890';
const GOAL_ID = '11111111-1111-4111-8111-111111111111';
const TEAM_ID = '22222222-2222-4222-8222-222222222222';

function setup() {
  const goal = { id: GOAL_ID, ownerUserId: 'owner-a', teamId: null };
  const team = { id: TEAM_ID, ownerUserId: 'owner-a' };
  const invite = { id: 'invite-a', targetType: 'goal', goalId: GOAL_ID, teamId: null, role: 'viewer', createdByUserId: 'owner-a', expiresAt: new Date(Date.now() + 60_000), revokedAt: null, goal, team: null };
  const tx = {
    inviteRedemption: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'redemption-a' }) },
    goalMember: { count: jest.fn().mockResolvedValue(0), upsert: jest.fn().mockResolvedValue({ id: 'membership-a' }) },
    teamMember: { upsert: jest.fn().mockResolvedValue({ id: 'team-membership-a' }) },
  };
  const prisma = {
    inviteLink: { create: jest.fn().mockResolvedValue(invite), findFirst: jest.fn().mockResolvedValue(invite), update: jest.fn().mockResolvedValue({ ...invite, revokedAt: new Date() }) },
    team: { findFirst: jest.fn().mockResolvedValue(team) },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const goals = { assertCanManageMembers: jest.fn().mockResolvedValue(goal) };
  const activity = { record: jest.fn().mockResolvedValue(undefined) };
  const config = { get: jest.fn().mockReturnValue('https://missionlive.example.test') };
  const service = new InvitesService(prisma as never, config as never, goals as never, activity as never);
  return { service, prisma, tx, goals, activity, invite, goal, team };
}

describe('InvitesService', () => {
  it('previews a valid invite without exposing private identifiers or role', async () => {
    const { service, prisma, invite } = setup();
    prisma.inviteLink.findFirst.mockResolvedValue({ ...invite, goal: { id: GOAL_ID, name: 'Meta compartilhada', teamId: null }, team: null });
    await expect(service.preview(TOKEN)).resolves.toEqual({ targetType: 'goal', name: 'Meta compartilhada', expiresAt: invite.expiresAt });
    expect(prisma.inviteLink.findFirst.mock.calls[0][0].where).toMatchObject({ tokenHash: hashToken(TOKEN), revokedAt: null, expiresAt: { gt: expect.any(Date) } });
  });

  it.each(['expired', 'revoked', 'invalid'])('hides an %s invite during preview and acceptance', async () => {
    const { service, prisma } = setup();
    prisma.inviteLink.findFirst.mockResolvedValue(null);
    await expect(service.preview(TOKEN)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.accept('guest-a', TOKEN)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('stores only a token hash, fixes role server-side, and expires after 24 hours', async () => {
    const { service, prisma, goals } = setup();
    const before = Date.now();
    const result = await service.create('owner-a', { targetType: 'goal', targetId: GOAL_ID, role: 'admin' } as never);
    const data = prisma.inviteLink.create.mock.calls[0][0].data;
    const token = result.url.split('/').at(-1)!;
    expect(goals.assertCanManageMembers).toHaveBeenCalledWith('owner-a', GOAL_ID);
    expect(data).toMatchObject({ targetType: 'goal', goalId: GOAL_ID, role: 'viewer', createdByUserId: 'owner-a', tokenHash: hashToken(token) });
    expect(data).not.toHaveProperty('token');
    expect(data.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 24 * 60 * 60 * 1000);
    expect(data.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 24 * 60 * 60 * 1000);
    expect(result.url).toContain('/invite/');
  });

  it('rejects direct invites to team goals and team invites from outsiders', async () => {
    const goalCase = setup();
    goalCase.goals.assertCanManageMembers.mockResolvedValue({ ...goalCase.goal, teamId: TEAM_ID });
    await expect(goalCase.service.create('owner-a', { targetType: 'goal', targetId: GOAL_ID })).rejects.toBeInstanceOf(BadRequestException);
    expect(goalCase.prisma.inviteLink.create).not.toHaveBeenCalled();
    const teamCase = setup();
    teamCase.prisma.team.findFirst.mockResolvedValue(null);
    await expect(teamCase.service.create('outsider', { targetType: 'team', targetId: TEAM_ID })).rejects.toBeInstanceOf(ForbiddenException);
    expect(teamCase.prisma.inviteLink.create).not.toHaveBeenCalled();
  });

  it('allows an authorized team admin to create a viewer invite', async () => {
    const { service, prisma } = setup();
    await service.create('team-admin', { targetType: 'team', targetId: TEAM_ID });
    expect(prisma.team.findFirst).toHaveBeenCalledWith({ where: { id: TEAM_ID, OR: [{ ownerUserId: 'team-admin' }, { members: { some: { userId: 'team-admin', role: 'admin' } } }] } });
    expect(prisma.inviteLink.create.mock.calls[0][0].data).toMatchObject({ teamId: TEAM_ID, role: 'viewer' });
  });

  it('creates goal membership and redemption in one transaction', async () => {
    const { service, prisma, tx } = setup();
    await expect(service.accept('guest-a', TOKEN)).resolves.toMatchObject({ accepted: true, alreadyMember: false, targetType: 'goal', goalId: GOAL_ID });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.goalMember.upsert).toHaveBeenCalledWith({ where: { goalId_userId: { goalId: GOAL_ID, userId: 'guest-a' } }, update: {}, create: { goalId: GOAL_ID, userId: 'guest-a', role: 'viewer' } });
    expect(tx.inviteRedemption.create).toHaveBeenCalledWith({ data: { inviteLinkId: 'invite-a', userId: 'guest-a' } });
  });

  it('is idempotent for an existing redemption and does not duplicate membership', async () => {
    const { service, tx } = setup();
    tx.inviteRedemption.findUnique.mockResolvedValue({ id: 'redemption-a' });
    await expect(service.accept('guest-a', TOKEN)).resolves.toMatchObject({ accepted: true, alreadyMember: true });
    expect(tx.goalMember.upsert).not.toHaveBeenCalled();
    expect(tx.inviteRedemption.create).not.toHaveBeenCalled();
  });

  it('records owner acceptance without creating an owner membership', async () => {
    const { service, tx } = setup();
    await expect(service.accept('owner-a', TOKEN)).resolves.toMatchObject({ accepted: true, alreadyMember: true, goalId: GOAL_ID });
    expect(tx.goalMember.upsert).not.toHaveBeenCalled();
    expect(tx.inviteRedemption.create).toHaveBeenCalledWith({ data: { inviteLinkId: 'invite-a', userId: 'owner-a' } });
  });

  it('rechecks guest capacity at acceptance', async () => {
    const { service, tx } = setup();
    tx.goalMember.count.mockResolvedValue(3);
    await expect(service.accept('guest-d', TOKEN)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.goalMember.upsert).not.toHaveBeenCalled();
    expect(tx.inviteRedemption.create).not.toHaveBeenCalled();
  });

  it('creates team membership and redemption together', async () => {
    const { service, prisma, tx, invite, team } = setup();
    prisma.inviteLink.findFirst.mockResolvedValue({ ...invite, targetType: 'team', goalId: null, teamId: TEAM_ID, goal: null, team });
    await expect(service.accept('member-a', TOKEN)).resolves.toMatchObject({ accepted: true, targetType: 'team', teamId: TEAM_ID });
    expect(tx.teamMember.upsert).toHaveBeenCalledWith({ where: { teamId_userId: { teamId: TEAM_ID, userId: 'member-a' } }, update: {}, create: { teamId: TEAM_ID, userId: 'member-a', role: 'viewer' } });
    expect(tx.inviteRedemption.create).toHaveBeenCalledWith({ data: { inviteLinkId: 'invite-a', userId: 'member-a' } });
  });

  it('only lets the creator revoke and rejects that token afterward', async () => {
    const { service, prisma } = setup();
    prisma.inviteLink.findFirst.mockResolvedValueOnce(null);
    await expect(service.revoke('other-user', 'invite-a')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.inviteLink.update).not.toHaveBeenCalled();
    prisma.inviteLink.findFirst.mockResolvedValueOnce({ id: 'invite-a', goalId: GOAL_ID, teamId: null });
    await expect(service.revoke('owner-a', 'invite-a')).resolves.toEqual({ revoked: true });
    expect(prisma.inviteLink.update).toHaveBeenCalledWith({ where: { id: 'invite-a' }, data: { revokedAt: expect.any(Date) } });
    prisma.inviteLink.findFirst.mockResolvedValueOnce(null);
    await expect(service.preview(TOKEN)).rejects.toBeInstanceOf(NotFoundException);
  });
});
