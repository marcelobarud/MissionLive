import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { ActivityService } from '../src/activity/activity.service';
import { GoalsService } from '../src/goals/goals.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { TemplatesService } from '../src/templates/templates.service';

const databaseFileName = `template-atomicity-${process.pid}-${randomUUID()}.db`;
const databaseUrl = `file:./data/${databaseFileName}`;
const databasePath = path.join(apiRoot, 'prisma', 'data', databaseFileName);
const failingTitle = 'falha controlada';

describe('TemplatesService atomicity (SQLite integration)', () => {
  let prisma: PrismaClient;
  let service: TemplatesService;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();
    const schema = [
      `CREATE TABLE "Goal" ("id" TEXT NOT NULL PRIMARY KEY, "ownerUserId" TEXT NOT NULL, "teamId" TEXT, "name" TEXT NOT NULL, "description" TEXT, "categoryId" TEXT, "customCategory" TEXT, "tagsJson" TEXT NOT NULL DEFAULT '[]', "startDate" DATETIME NOT NULL, "endDate" DATETIME, "status" TEXT NOT NULL DEFAULT 'active', "recurrenceType" TEXT NOT NULL DEFAULT 'NONE', "recurrenceTimezone" TEXT, "completedAt" DATETIME, "completionMode" TEXT, "completedByUserId" TEXT, "completionOverrideReason" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE "GoalStep" ("id" TEXT NOT NULL PRIMARY KEY, "goalId" TEXT NOT NULL REFERENCES "Goal"("id") ON DELETE CASCADE, "title" TEXT NOT NULL, "description" TEXT, "position" INTEGER NOT NULL, "assignmentMode" TEXT NOT NULL DEFAULT 'ALL_PARTICIPANTS', "assigneeUserId" TEXT, "assigneeName" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE ("goalId", "position"))`,
      `CREATE TABLE "GoalTemplate" ("id" TEXT NOT NULL PRIMARY KEY, "ownerUserId" TEXT, "name" TEXT NOT NULL, "description" TEXT, "categoryId" TEXT, "customCategory" TEXT, "tagsJson" TEXT NOT NULL DEFAULT '[]', "stepsJson" TEXT NOT NULL DEFAULT '[]', "isOfficial" BOOLEAN NOT NULL DEFAULT false, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE "Team" ("id" TEXT NOT NULL PRIMARY KEY, "ownerUserId" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "avatarUrl" TEXT, "imageFileKey" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE "TeamMember" ("id" TEXT NOT NULL PRIMARY KEY, "teamId" TEXT NOT NULL, "userId" TEXT NOT NULL, "role" TEXT NOT NULL, "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE ("teamId", "userId"))`,
      `CREATE TABLE "GoalMember" ("id" TEXT NOT NULL PRIMARY KEY, "goalId" TEXT NOT NULL, "userId" TEXT NOT NULL, "role" TEXT NOT NULL, "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE ("goalId", "userId"))`,
      `CREATE TABLE "ActivityEvent" ("id" TEXT NOT NULL PRIMARY KEY, "actorUserId" TEXT NOT NULL, "eventType" TEXT NOT NULL, "goalId" TEXT, "teamId" TEXT, "targetUserId" TEXT, "metadataJson" TEXT NOT NULL DEFAULT '{}', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE "Notification" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "type" TEXT NOT NULL, "title" TEXT NOT NULL, "body" TEXT NOT NULL, "goalId" TEXT, "teamId" TEXT, "reminderId" TEXT, "deliveryKey" TEXT UNIQUE, "readAt" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    ];
    for (const statement of schema) await prisma.$executeRawUnsafe(statement);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER fail_template_step_insert
      BEFORE INSERT ON "GoalStep"
      WHEN NEW."title" = '${failingTitle}'
      BEGIN
        SELECT RAISE(ABORT, 'Falha controlada ao inserir passo');
      END
    `);

    const activity = new ActivityService(prisma as unknown as PrismaService);
    const goals = new GoalsService(prisma as unknown as PrismaService, activity);
    jest.spyOn(goals, 'get').mockImplementation(async (_userId, goalId) => {
      const goal = await prisma.goal.findUnique({ where: { id: goalId }, include: { steps: { orderBy: { position: 'asc' } } } });
      if (!goal) throw new Error('Goal not found after template use.');
      return { ...goal, tags: JSON.parse(goal.tagsJson || '[]') as string[] } as never;
    });
    service = new TemplatesService(prisma as unknown as PrismaService, goals, activity);
  }, 60_000);

  afterAll(async () => {
    await prisma?.$disconnect();
    for (const suffix of ['', '-journal', '-wal', '-shm']) {
      const file = `${databasePath}${suffix}`;
      if (existsSync(file)) rmSync(file);
    }
  });

  async function createFixture(stepTitles: string[]) {
    const ownerId = randomUUID();
    const memberId = randomUUID();
    const team = await prisma.team.create({ data: { ownerUserId: ownerId, name: 'Equipe de teste' } });
    await prisma.teamMember.create({ data: { teamId: team.id, userId: memberId, role: 'viewer' } });
    const template = await prisma.goalTemplate.create({
      data: {
        ownerUserId: ownerId,
        name: 'Plano de teste',
        description: 'Descrição do modelo',
        customCategory: 'Planejamento',
        tagsJson: '["planejamento"]',
        stepsJson: JSON.stringify(stepTitles),
      },
    });
    return { ownerId, memberId, team, template };
  }

  const rollbackCases = [
    { position: 'primeiro', titles: [failingTitle, 'Segundo', 'Terceiro'] },
    { position: 'intermediário', titles: ['Primeiro', failingTitle, 'Terceiro'] },
    { position: 'último', titles: ['Primeiro', 'Segundo', failingTitle] },
  ];

  it.each(rollbackCases)('reverte meta, passos e eventos quando falha o passo $position', async ({ titles }) => {
    const { ownerId, memberId, team, template } = await createFixture(titles);
    const stepCountBefore = await prisma.goalStep.count();

    await expect(service.use(ownerId, template.id, { startDate: '2026-10-01', teamId: team.id })).rejects.toThrow();

    const remainingGoals = await prisma.goal.findMany({ where: { ownerUserId: ownerId }, select: { id: true } });
    expect(remainingGoals).toHaveLength(0);
    expect(await prisma.goalStep.count()).toBe(stepCountBefore);
    expect(await prisma.activityEvent.count({ where: { actorUserId: ownerId } })).toBe(0);
    expect(await prisma.notification.count({ where: { userId: memberId } })).toBe(0);
  });

  it('persists a personal template in order and emits the existing activities and team notifications after commit', async () => {
    const { ownerId, memberId, team, template } = await createFixture(['  Preparar  ', 'Executar', 'Revisar']);

    const result = await service.use(ownerId, template.id, {
      startDate: '2026-10-01',
      endDate: '2026-10-10',
      teamId: team.id,
    });

    expect(result).toMatchObject({
      name: 'Plano de teste',
      description: 'Descrição do modelo',
      customCategory: 'Planejamento',
      tags: ['planejamento'],
      teamId: team.id,
    });
    expect(result.steps.map((step) => ({ title: step.title, position: step.position }))).toEqual([
      { title: 'Preparar', position: 0 },
      { title: 'Executar', position: 1 },
      { title: 'Revisar', position: 2 },
    ]);

    const events = await prisma.activityEvent.findMany({ where: { goalId: result.id }, select: { eventType: true, teamId: true } });
    expect(events.map((event) => event.eventType).sort()).toEqual([
      'goal_created', 'step_created', 'step_created', 'step_created', 'template_used',
    ].sort());
    expect(events.find((event) => event.eventType === 'goal_created')?.teamId).toBe(team.id);

    const notifications = await prisma.notification.findMany({ where: { userId: memberId, goalId: result.id }, select: { type: true } });
    expect(notifications.map((notification) => notification.type).sort()).toEqual([
      'goal_created', 'step_created', 'step_created', 'step_created', 'template_used',
    ].sort());
  });

  it('preserves team authorization before starting the transaction', async () => {
    const { memberId, team } = await createFixture(['Primeiro', 'Segundo']);

    await expect(service.use(memberId, 'official:trip', { startDate: '2026-10-01', teamId: team.id })).rejects.toThrow('You cannot create goals in this team.');
    expect(await prisma.goal.count({ where: { teamId: team.id } })).toBe(0);
    expect(await prisma.activityEvent.count({ where: { actorUserId: memberId } })).toBe(0);
  });
});
