import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { PrismaClient } from '@prisma/client';
import { CalendarService } from '../src/calendar/calendar.service';
import { localDateAt } from '../src/common/timezone';
import { GoalsService } from '../src/goals/goals.service';
import { ListGoalsQueryDto } from '../src/goals/goals.dto';

const databaseFileName = `goals-pagination-${process.pid}-${randomUUID()}.db`;
const databaseUrl = `file:./data/${databaseFileName}`;
const databasePath = path.join(__dirname, '..', 'prisma', 'data', databaseFileName);
const startDate = new Date('2026-09-01T00:00:00.000Z');
const pageSize = 12;

function fixedId(value: number) {
  return `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`;
}

describe('ListGoalsQueryDto pagination', () => {
  it('uses page 1 and pageSize 12 by default and transforms numeric strings', () => {
    const defaults = plainToInstance(ListGoalsQueryDto, {});
    const explicit = plainToInstance(ListGoalsQueryDto, { page: '3', pageSize: '50' });

    expect(defaults).toMatchObject({ page: 1, pageSize: 12 });
    expect(explicit).toMatchObject({ page: 3, pageSize: 50 });
    expect(validateSync(defaults)).toHaveLength(0);
    expect(validateSync(explicit)).toHaveLength(0);
  });

  it.each([
    ['page zero', { page: '0' }],
    ['negative page', { page: '-2' }],
    ['page fraction', { page: '1.5' }],
    ['invalid page', { page: 'invalid' }],
    ['pageSize zero', { pageSize: '0' }],
    ['pageSize over 50', { pageSize: '51' }],
    ['pageSize fraction', { pageSize: '2.5' }],
  ])('rejects %s', (_label, input) => {
    expect(validateSync(plainToInstance(ListGoalsQueryDto, input)).length).toBeGreaterThan(0);
  });
});

describe('GoalsService paginated list (SQLite integration)', () => {
  let prisma: PrismaClient;
  let goals: GoalsService;
  let userA: string;
  let userB: string;
  let userC: string;
  let categoryId: string;
  let volumeGoalIds: string[];
  let sortable: Array<{ id: string; name: string; updatedAt: Date; endDate: Date }>;

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

    userA = randomUUID(); userB = randomUUID(); userC = randomUUID();
    await prisma.user.createMany({ data: [
      { id: userA, email: `${userA}@example.test`, name: 'Pessoa A', timezone: 'UTC' },
      { id: userB, email: `${userB}@example.test`, name: 'Pessoa B', timezone: 'UTC' },
      { id: userC, email: `${userC}@example.test`, name: 'Pessoa C', timezone: 'UTC' },
    ] });
    categoryId = randomUUID();
    await prisma.category.create({ data: { id: categoryId, name: `Paginação ${randomUUID()}` } });
    const volumeRows = Array.from({ length: 500 }, (_, index) => ({
      id: randomUUID(), ownerUserId: userA, name: `Volume 500 Goal ${String(index).padStart(3, '0')}`,
      startDate, endDate: new Date(startDate.getTime() + 30 * 86_400_000), status: 'active', tagsJson: '[]',
      updatedAt: new Date(startDate.getTime() + (500 - index) * 1_000),
    }));
    volumeGoalIds = volumeRows.map((goal) => goal.id);
    await prisma.goal.createMany({ data: volumeRows });

    const teamId = randomUUID();
    await prisma.team.create({ data: { id: teamId, ownerUserId: userB, name: 'Equipe compartilhada' } });
    await prisma.teamMember.create({ data: { id: randomUUID(), teamId, userId: userA, role: 'viewer' } });
    const sharedGoalId = randomUUID();
    await prisma.goal.create({ data: { id: sharedGoalId, ownerUserId: userB, name: 'Compartilhada pesquisável', description: 'TextoBusca na descrição', categoryId, tagsJson: '["BuscaTag"]', startDate, endDate: new Date(startDate.getTime() + 86_400_000) } });
    await prisma.goalMember.create({ data: { id: randomUUID(), goalId: sharedGoalId, userId: userA, role: 'viewer' } });
    await prisma.goal.create({ data: { id: randomUUID(), ownerUserId: userB, teamId, name: 'Meta da equipe', startDate, endDate: new Date(startDate.getTime() + 2 * 86_400_000) } });
    await prisma.goal.createMany({ data: Array.from({ length: 20 }, (_, index) => ({ id: randomUUID(), ownerUserId: userB, name: `Privada de B ${index}`, startDate, endDate: null })) });
    await prisma.goal.create({ data: { id: randomUUID(), ownerUserId: userA, name: 'Meta concluída para filtro', startDate, endDate: null, status: 'completed' } });
    await prisma.goal.create({ data: { id: randomUUID(), ownerUserId: userA, name: 'Meta perene sem prazo', startDate, endDate: null } });

    await prisma.goal.createMany({ data: [
      ...Array.from({ length: 12 }, (_, index) => ({ id: randomUUID(), ownerUserId: userA, name: `Envelope 12 - ${String(index).padStart(2, '0')}`, startDate })),
      ...Array.from({ length: 13 }, (_, index) => ({ id: randomUUID(), ownerUserId: userA, name: `Envelope 13 - ${String(index).padStart(2, '0')}`, startDate })),
      { id: randomUUID(), ownerUserId: userA, name: 'Small match', startDate },
    ] });

    sortable = Array.from({ length: 13 }, (_, index) => ({
      id: fixedId(100 + index),
      name: index < 2 ? 'Ordenável A' : `Ordenável ${String.fromCharCode(65 + index)}`,
      updatedAt: new Date(startDate.getTime() + (index < 2 ? 20 : 13 - index) * 60_000),
      endDate: new Date(startDate.getTime() + (index < 2 ? 1 : index) * 86_400_000),
    }));
    await prisma.goal.createMany({ data: sortable.map((goal) => ({ ...goal, ownerUserId: userA, startDate })) });

    const progressGoals = Array.from({ length: 13 }, (_, index) => ({ id: randomUUID(), ownerUserId: userA, name: `Progress global ${String(index).padStart(2, '0')}`, startDate, updatedAt: startDate }));
    await prisma.goal.createMany({ data: progressGoals });
    const progressSteps = progressGoals.flatMap((goal, goalIndex) => Array.from({ length: 20 }, (_, position) => ({ id: randomUUID(), goalId: goal.id, title: `Passo ${position}`, position, completed: position < goalIndex + 1 })));
    await prisma.goalStep.createMany({ data: progressSteps.map(({ id, goalId, title, position }) => ({ id, goalId, title, position })) });
    await prisma.goalStepProgress.createMany({ data: progressSteps.filter((step) => step.completed).map((step) => ({ id: randomUUID(), goalStepId: step.id, userId: userA, completed: true })) });

    const tieGoals = [
      { id: fixedId(3), updatedAt: new Date('2026-09-01T10:00:00.000Z') },
      { id: fixedId(2), updatedAt: new Date('2026-09-01T11:00:00.000Z') },
      { id: fixedId(1), updatedAt: new Date('2026-09-01T11:00:00.000Z') },
    ];
    await prisma.goal.createMany({ data: tieGoals.map((goal, index) => ({ ...goal, ownerUserId: userA, name: `Progress empate ${index}`, startDate })) });

    const assignedGoal = await prisma.goal.create({ data: { id: randomUUID(), ownerUserId: userA, name: 'Progress assignment atribuído', startDate } });
    await prisma.goalMember.create({ data: { id: randomUUID(), goalId: assignedGoal.id, userId: userB, role: 'viewer' } });
    const assignedStep = await prisma.goalStep.create({ data: { id: randomUUID(), goalId: assignedGoal.id, title: 'Todos', position: 0 } });
    const otherParticipantStep = await prisma.goalStep.create({ data: { id: randomUUID(), goalId: assignedGoal.id, title: 'Somente B', position: 1, assignmentMode: 'SPECIFIC_PARTICIPANT', assigneeUserId: userB } });
    await prisma.goalStepProgress.createMany({ data: [assignedStep, otherParticipantStep].map((step) => ({ id: randomUUID(), goalStepId: step.id, userId: userA, completed: true })) });
    const comparisonGoal = await prisma.goal.create({ data: { id: randomUUID(), ownerUserId: userA, name: 'Progress assignment parcial', startDate } });
    const comparisonSteps = await Promise.all([0, 1].map((position) => prisma.goalStep.create({ data: { id: randomUUID(), goalId: comparisonGoal.id, title: `Parcial ${position}`, position } })));
    await prisma.goalStepProgress.create({ data: { id: randomUUID(), goalStepId: comparisonSteps[0].id, userId: userA, completed: true } });

    const dailyGoal = await prisma.goal.create({ data: { id: randomUUID(), ownerUserId: userA, name: 'Progress DAILY-check diária', startDate, recurrenceType: 'DAILY', recurrenceTimezone: 'UTC', updatedAt: new Date('2026-09-01T10:00:00.000Z') } });
    await prisma.goalMember.create({ data: { id: randomUUID(), goalId: dailyGoal.id, userId: userB, role: 'viewer' } });
    const dailyStep = await prisma.goalStep.create({ data: { id: randomUUID(), goalId: dailyGoal.id, title: 'Passo diário', position: 0 } });
    await prisma.goalStepProgress.create({ data: { id: randomUUID(), goalStepId: dailyStep.id, userId: userA, completed: true } });
    const currentOccurrence = await prisma.goalDailyOccurrence.create({ data: { id: randomUUID(), goalId: dailyGoal.id, localDate: localDateAt(new Date(), 'UTC') } });
    await prisma.goalDailyStepProgress.create({ data: { id: randomUUID(), occurrenceId: currentOccurrence.id, goalStepId: dailyStep.id, userId: userB, completed: true } });
    const normalGoal = await prisma.goal.create({ data: { id: randomUUID(), ownerUserId: userA, name: 'Progress DAILY-check normal', startDate, updatedAt: new Date('2026-09-01T11:00:00.000Z') } });
    await prisma.goalStep.create({ data: { id: randomUUID(), goalId: normalGoal.id, title: 'Passo normal', position: 0 } });
    void currentOccurrence;

    goals = new GoalsService(prisma as never);
  }, 60_000);

  afterAll(async () => {
    await prisma?.$disconnect();
    for (const suffix of ['', '-journal', '-wal', '-shm']) {
      const file = `${databasePath}${suffix}`;
      if (existsSync(file)) rmSync(file);
    }
  });

  it('retorna envelope consistente para vazio, abaixo, igual e acima de uma página; clampa páginas altas', async () => {
    const empty = await goals.list(userC, { q: 'não existe' });
    expect(empty).toEqual({ items: [], pagination: { page: 1, pageSize: 12, totalItems: 0, totalPages: 0 } });

    const small = await goals.list(userA, { q: 'Small match' });
    expect(small.pagination).toEqual({ page: 1, pageSize: 12, totalItems: 1, totalPages: 1 });
    expect(small.items).toHaveLength(1);

    const exact = await goals.list(userA, { q: 'Envelope 12' });
    expect(exact.pagination).toEqual({ page: 1, pageSize: 12, totalItems: 12, totalPages: 1 });
    expect(exact.items).toHaveLength(12);

    const first = await goals.list(userA, { q: 'Envelope 13', page: 1 });
    const last = await goals.list(userA, { q: 'Envelope 13', page: 2 });
    expect(first.pagination).toEqual({ page: 1, pageSize: 12, totalItems: 13, totalPages: 2 });
    expect(last.pagination).toEqual({ page: 2, pageSize: 12, totalItems: 13, totalPages: 2 });
    expect(first.items).toHaveLength(12);
    expect(last.items).toHaveLength(1);

    const clamped = await goals.list(userA, { q: 'Envelope 13', page: 99 });
    expect(clamped.pagination).toMatchObject({ page: 2, pageSize: 12, totalItems: 13, totalPages: 2 });
    expect(clamped.items).toHaveLength(1);
  });

  it('aplica os filtros antes da contagem e da página', async () => {
    await expect(goals.list(userA, { status: 'completed' })).resolves.toMatchObject({ pagination: { totalItems: 1 } });
    await expect(goals.list(userA, { context: 'shared' })).resolves.toMatchObject({ pagination: { totalItems: 3 } });
    await expect(goals.list(userA, { context: 'team' })).resolves.toMatchObject({ pagination: { totalItems: 1 } });
    await expect(goals.list(userA, { categoryId })).resolves.toMatchObject({ pagination: { totalItems: 1 } });
    await expect(goals.list(userA, { q: 'TextoBusca' })).resolves.toMatchObject({ pagination: { totalItems: 1 } });
    await expect(goals.list(userA, { hasDeadline: false, q: 'Meta perene' })).resolves.toMatchObject({ pagination: { totalItems: 1 } });
    await expect(goals.list(userA, { hasDeadline: true, q: 'Compartilhada pesquisável' })).resolves.toMatchObject({ pagination: { totalItems: 1 } });
  });

  it('não inclui metas inacessíveis no total e aplica owner, membership direta e membership de equipe', async () => {
    const ownerPage = await goals.list(userA, { pageSize: 50 });
    const unrelatedPage = await goals.list(userC);

    expect(ownerPage.pagination.totalItems).toBeGreaterThan(500);
    expect(ownerPage.items.map((goal) => goal.name)).toContain('Compartilhada pesquisável');
    expect(ownerPage.items.map((goal) => goal.name)).toContain('Meta da equipe');
    expect(unrelatedPage.pagination).toEqual({ page: 1, pageSize: 12, totalItems: 0, totalPages: 0 });
  });

  it.each(['recent', 'name', 'deadline'] as const)('mantém %s determinístico sem duplicar itens entre páginas', async (sort) => {
    const first = await goals.list(userA, { q: 'Ordenável', sort, page: 1 });
    const last = await goals.list(userA, { q: 'Ordenável', sort, page: 2 });
    const all = [...first.items, ...last.items];
    const expected = [...sortable].sort((left, right) => {
      if (sort === 'recent') return right.updatedAt.getTime() - left.updatedAt.getTime() || left.id.localeCompare(right.id);
      if (sort === 'name') return left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
      return left.endDate.getTime() - right.endDate.getTime() || left.id.localeCompare(right.id);
    });

    expect(first.items).toHaveLength(12);
    expect(last.items).toHaveLength(1);
    expect(all.map((goal) => goal.id)).toEqual(expected.map((goal) => goal.id));
    expect(new Set(all.map((goal) => goal.id)).size).toBe(13);
  });

  it('ordena progress-desc globalmente entre páginas e hidrata apenas os IDs da página', async () => {
    const first = await goals.list(userA, { q: 'Progress global', sort: 'progress-desc', page: 1 });
    const last = await goals.list(userA, { q: 'Progress global', sort: 'progress-desc', page: 2 });

    expect(first.items.map((goal) => goal.name)).toEqual(Array.from({ length: 12 }, (_, index) => `Progress global ${String(12 - index).padStart(2, '0')}`));
    expect(last.items.map((goal) => goal.name)).toEqual(['Progress global 00']);

    const findManySpy = jest.spyOn(prisma.goal, 'findMany');
    const volumePage = await goals.list(userA, { q: 'Volume 500 Goal', sort: 'progress-desc' });
    const calls = findManySpy.mock.calls.map(([args]) => args);
    findManySpy.mockRestore();

    expect(volumePage.pagination.totalItems).toBe(500);
    expect(volumePage.items).toHaveLength(12);
    expect(calls).toHaveLength(2);
    expect(calls[0]?.select).toMatchObject({ id: true, updatedAt: true, ownerUserId: true, steps: { select: { id: true, assignmentMode: true, assigneeUserId: true } } });
    expect(calls[0]?.select).not.toHaveProperty('category');
    const hydratedIds = (calls[1]?.where as { AND: Array<{ id?: { in?: string[] } }> }).AND.find((filter) => filter.id)?.id?.in;
    expect(hydratedIds).toHaveLength(pageSize);
  });

  it('ordena progress-asc globalmente entre páginas', async () => {
    const first = await goals.list(userA, { q: 'Progress global', sort: 'progress-asc', page: 1 });
    const last = await goals.list(userA, { q: 'Progress global', sort: 'progress-asc', page: 2 });

    expect(first.items.map((goal) => goal.name)).toEqual(Array.from({ length: 12 }, (_, index) => `Progress global ${String(index).padStart(2, '0')}`));
    expect(last.items.map((goal) => goal.name)).toEqual(['Progress global 12']);
  });

  it('resolve empates de progresso por updatedAt DESC e depois id ASC', async () => {
    const page1 = await goals.list(userA, { q: 'Progress empate', sort: 'progress-desc', page: 1, pageSize: 1 });
    const page2 = await goals.list(userA, { q: 'Progress empate', sort: 'progress-desc', page: 2, pageSize: 1 });
    const page3 = await goals.list(userA, { q: 'Progress empate', sort: 'progress-desc', page: 3, pageSize: 1 });

    expect([page1, page2, page3].map((page) => page.items[0].id)).toEqual([fixedId(1), fixedId(2), fixedId(3)]);
  });

  it('calcula assignment somente sobre os passos aplicáveis ao viewer', async () => {
    const result = await goals.list(userA, { q: 'Progress assignment', sort: 'progress-desc' });

    expect(result.items[0].name).toBe('Progress assignment atribuído');
    expect(result.items[0].progressSummary).toMatchObject({ completedSteps: 1, totalSteps: 1 });
  });

  it('usa a ocorrência atual no progress sort DAILY, ignorando progresso histórico', async () => {
    const result = await goals.list(userA, { q: 'Progress DAILY-check', sort: 'progress-desc' });

    expect(result.items.map((goal) => goal.name)).toEqual(['Progress DAILY-check normal', 'Progress DAILY-check diária']);
    expect(result.items[1].progressSummary).toMatchObject({ completedSteps: 0, totalSteps: 1, completedParticipants: 1 });
  });

  it('usa skip/take antes de hidratar metas comuns e mantém Calendar acima de 12 resultados', async () => {
    const findManySpy = jest.spyOn(prisma.goal, 'findMany');
    const page = await goals.list(userA, { q: 'Volume 500 Goal', sort: 'recent' });
    const query = findManySpy.mock.calls[0][0];
    findManySpy.mockRestore();

    expect(page.pagination).toMatchObject({ page: 1, pageSize: 12, totalItems: 500 });
    expect(page.items).toHaveLength(12);
    expect(query).toMatchObject({ skip: 0, take: 12, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }] });

    const calendar = new CalendarService({ reminder: { findMany: jest.fn().mockResolvedValue([]) } } as never, goals);
    const from = new Date(startDate.getTime() - 86_400_000);
    const to = new Date(startDate.getTime() + 31 * 86_400_000);
    const calendarData = await calendar.list(userA, from.toISOString(), to.toISOString());
    expect(calendarData.goals.filter((goal) => volumeGoalIds.includes(goal.id))).toHaveLength(500);
  });
});
