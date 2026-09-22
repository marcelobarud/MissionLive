import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { localDateAt } from '../src/common/timezone';
import { DashboardReadService } from '../src/dashboard/dashboard-read.service';
import { GoalsService } from '../src/goals/goals.service';

const databaseFileName = `dashboard-read-${process.pid}-${randomUUID()}.db`;
const databaseUrl = `file:./data/${databaseFileName}`;
const databasePath = path.join(__dirname, '..', 'prisma', 'data', databaseFileName);

describe('DashboardReadService (SQLite integration)', () => {
  let prisma: PrismaClient;
  let dashboard: DashboardReadService;
  let now: Date;
  let userA: string;
  let userB: string;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();
    const schema = [
      `CREATE TABLE "User" ("id" TEXT NOT NULL PRIMARY KEY, "email" TEXT NOT NULL UNIQUE, "name" TEXT NOT NULL, "avatarUrl" TEXT, "avatarType" TEXT, "avatarPresetId" TEXT, "avatarFileKey" TEXT, "passwordHash" TEXT, "emailVerifiedAt" DATETIME, "status" TEXT NOT NULL DEFAULT 'active', "platformRole" TEXT NOT NULL DEFAULT 'USER', "timezone" TEXT NOT NULL DEFAULT 'UTC', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "onboardingCompletedAt" DATETIME, "preferencesJson" TEXT NOT NULL DEFAULT '{}', "phone" TEXT, "birthDate" TEXT, "countryCode" TEXT, "region" TEXT, "city" TEXT)`,
      `CREATE TABLE "Category" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL UNIQUE, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE "Team" ("id" TEXT NOT NULL PRIMARY KEY, "ownerUserId" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "avatarUrl" TEXT, "imageFileKey" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE "TeamMember" ("id" TEXT NOT NULL PRIMARY KEY, "teamId" TEXT NOT NULL, "userId" TEXT NOT NULL, "role" TEXT NOT NULL, "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE "Goal" ("id" TEXT NOT NULL PRIMARY KEY, "ownerUserId" TEXT NOT NULL, "teamId" TEXT, "name" TEXT NOT NULL, "description" TEXT, "categoryId" TEXT, "customCategory" TEXT, "tagsJson" TEXT NOT NULL DEFAULT '[]', "startDate" DATETIME NOT NULL, "endDate" DATETIME, "status" TEXT NOT NULL DEFAULT 'active', "recurrenceType" TEXT NOT NULL DEFAULT 'NONE', "recurrenceTimezone" TEXT, "completedAt" DATETIME, "completionMode" TEXT, "completedByUserId" TEXT, "completionOverrideReason" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE "GoalMember" ("id" TEXT NOT NULL PRIMARY KEY, "goalId" TEXT NOT NULL, "userId" TEXT NOT NULL, "role" TEXT NOT NULL, "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE "GoalStep" ("id" TEXT NOT NULL PRIMARY KEY, "goalId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT, "position" INTEGER NOT NULL, "assignmentMode" TEXT NOT NULL DEFAULT 'ALL_PARTICIPANTS', "assigneeUserId" TEXT, "assigneeName" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE "GoalStepProgress" ("id" TEXT NOT NULL PRIMARY KEY, "goalStepId" TEXT NOT NULL, "userId" TEXT NOT NULL, "completed" BOOLEAN NOT NULL DEFAULT false, "completedAt" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE "GoalDailyOccurrence" ("id" TEXT NOT NULL PRIMARY KEY, "goalId" TEXT NOT NULL, "localDate" TEXT NOT NULL, "completedAt" DATETIME, "completionMode" TEXT, "completedByUserId" TEXT, "completionOverrideReason" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE "GoalDailyStepProgress" ("id" TEXT NOT NULL PRIMARY KEY, "occurrenceId" TEXT NOT NULL, "goalStepId" TEXT NOT NULL, "userId" TEXT NOT NULL, "completed" BOOLEAN NOT NULL DEFAULT false, "completedAt" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    ];
    for (const statement of schema) await prisma.$executeRawUnsafe(statement);
    now = new Date();
    userA = randomUUID(); userB = randomUUID();
    await prisma.user.createMany({ data: [{ id: userA, email: `${userA}@example.test`, name: 'Pessoa A', timezone: 'UTC' }, { id: userB, email: `${userB}@example.test`, name: 'Pessoa B', timezone: 'UTC' }] });
    const category = await prisma.category.create({ data: { name: `Dashboard ${randomUUID()}` } });
    const team = await prisma.team.create({ data: { id: randomUUID(), ownerUserId: userB, name: 'Equipe compartilhada' } });
    await prisma.teamMember.create({ data: { teamId: team.id, userId: userA, role: 'viewer' } });
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const future = new Date(now.getTime() + 10 * 86_400_000);
    const soon = new Date(now.getTime() + 5 * 86_400_000);
    const overdue = new Date(now.getTime() - 5 * 86_400_000);
    const createGoal = (data: Parameters<typeof prisma.goal.create>[0]['data']) => prisma.goal.create({ data });
    const individual = await createGoal({ id: randomUUID(), ownerUserId: userA, name: 'Individual com assignment', categoryId: category.id, startDate: monthStart, endDate: future, status: 'active', updatedAt: new Date(now.getTime() - 4_000) });
    const shared = await createGoal({ id: randomUUID(), ownerUserId: userB, name: 'Compartilhada', customCategory: 'Planejamento', startDate: monthStart, endDate: soon, status: 'active', updatedAt: new Date(now.getTime() - 1_000) });
    const teamGoal = await createGoal({ id: randomUUID(), ownerUserId: userB, teamId: team.id, name: 'Meta de equipe atrasada', startDate: monthStart, endDate: overdue, status: 'active', updatedAt: new Date(now.getTime() - 5_000) });
    const daily = await createGoal({ id: randomUUID(), ownerUserId: userA, name: 'Meta diária', startDate: monthStart, status: 'active', recurrenceType: 'DAILY', recurrenceTimezone: 'UTC', updatedAt: new Date(now.getTime() - 2_000) });
    const nearly = await createGoal({ id: randomUUID(), ownerUserId: userA, name: 'Meta quase concluída', startDate: monthStart, status: 'active', updatedAt: new Date(now.getTime() - 3_000) });
    await createGoal({ id: randomUUID(), ownerUserId: userA, name: 'Meta concluída', categoryId: category.id, startDate: monthStart, status: 'completed', completedAt: new Date(now.getFullYear(), now.getMonth(), 5), updatedAt: new Date(now.getTime() - 6_000) });
    await createGoal({ id: randomUUID(), ownerUserId: userB, name: 'Meta inacessível', startDate: monthStart, status: 'completed', completedAt: new Date(now.getFullYear(), now.getMonth(), 6), updatedAt: new Date(now.getTime() + 10_000) });
    await prisma.goalMember.create({ data: { goalId: shared.id, userId: userA, role: 'viewer' } });
    const individualAll = await prisma.goalStep.create({ data: { goalId: individual.id, title: 'Passo comum', position: 0 } });
    const individualOther = await prisma.goalStep.create({ data: { goalId: individual.id, title: 'Passo de B', position: 1, assignmentMode: 'SPECIFIC_PARTICIPANT', assigneeUserId: userB } });
    await prisma.goalStepProgress.createMany({ data: [{ goalStepId: individualAll.id, userId: userA, completed: true }, { goalStepId: individualOther.id, userId: userA, completed: true }] });
    const sharedStep = await prisma.goalStep.create({ data: { goalId: shared.id, title: 'Passo compartilhado', position: 0 } });
    await prisma.goalStepProgress.create({ data: { goalStepId: sharedStep.id, userId: userA, completed: true } });
    await prisma.goalStep.create({ data: { goalId: teamGoal.id, title: 'Passo da equipe', position: 0 } });
    const dailySteps = await Promise.all([0, 1].map((position) => prisma.goalStep.create({ data: { goalId: daily.id, title: `Diário ${position}`, position } })));
    await prisma.goalStepProgress.createMany({ data: dailySteps.map((step) => ({ goalStepId: step.id, userId: userA, completed: true })) });
    const dailyOccurrence = await prisma.goalDailyOccurrence.create({ data: { goalId: daily.id, localDate: localDateAt(now, 'UTC') } });
    await prisma.goalDailyStepProgress.create({ data: { occurrenceId: dailyOccurrence.id, goalStepId: dailySteps[0].id, userId: userA, completed: true } });
    await Promise.all([0, 1, 2, 3].map((position) => prisma.goalStep.create({ data: { goalId: nearly.id, title: `Quase ${position}`, position } }).then((step) => prisma.goalStepProgress.create({ data: { goalStepId: step.id, userId: userA, completed: position < 3 } }))));
    const goals = new GoalsService(prisma as never);
    dashboard = new DashboardReadService(prisma as never, goals);
  }, 60_000);

  afterAll(async () => {
    await prisma?.$disconnect();
    for (const suffix of ['', '-journal', '-wal', '-shm']) {
      const file = `${databasePath}${suffix}`;
      if (existsSync(file)) rmSync(file);
    }
  });

  it('applies the same authorization to counts, breakdowns, rankings and hydrated cards', async () => {
    const summary = await dashboard.summary(userA);

    expect(summary.counts).toMatchObject({ total: 6, completed: 1, open: 5, completionRate: 17, activeProgress: 55 });
    expect(summary.contextBreakdown).toEqual(expect.arrayContaining([{ label: 'Individual', count: 4 }, { label: 'Compartilhada', count: 1 }, { label: 'Equipe', count: 1 }]));
    expect(summary.categoryBreakdown).toEqual(expect.arrayContaining([{ label: expect.stringMatching(/^Dashboard /), count: 2 }, { label: 'Planejamento', count: 1 }, { label: 'Sem categoria', count: 3 }]));
    expect(summary.upcomingDeadlines.map((goal) => goal.name)).toEqual(['Compartilhada', 'Individual com assignment']);
    expect(summary.overdueGoals.map((goal) => goal.name)).toEqual(['Meta de equipe atrasada']);
    expect(summary.nearlyCompleteGoals.map((goal) => goal.name)).toEqual(['Compartilhada', 'Meta quase concluída']);
    expect(summary.recentGoals.map((goal) => goal.name)).not.toContain('Meta inacessível');
    expect(summary.completionTimeline.at(-1)?.count).toBe(1);
    const dailyCard = summary.recentGoals.find((goal) => goal.name === 'Meta diária');
    expect(dailyCard?.progressSummary).toMatchObject({ completedSteps: 1, totalSteps: 2 });
  });
});
