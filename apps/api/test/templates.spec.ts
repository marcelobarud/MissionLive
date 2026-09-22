import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TemplatesService } from '../src/templates/templates.service';

const GOAL_ID = '11111111-1111-4111-8111-111111111111';
const TEMPLATE_ID = '22222222-2222-4222-8222-222222222222';

function setup() {
  const template = { id: TEMPLATE_ID, ownerUserId: 'user-a', name: 'Meu modelo', description: 'Descrição', categoryId: null, customCategory: 'Casa', tagsJson: '["planejamento"]', stepsJson: '["Etapa 1","Etapa 2"]' };
  const prisma = { goalTemplate: { findMany: jest.fn().mockResolvedValue([template]), create: jest.fn().mockResolvedValue(template), findFirst: jest.fn().mockResolvedValue(template), delete: jest.fn().mockResolvedValue(template) } };
  const goals = { get: jest.fn().mockResolvedValue({ id: GOAL_ID, tags: ['saúde'], steps: [{ title: 'Avaliar rotina' }] }), create: jest.fn().mockResolvedValue({ id: 'new-goal' }), addStep: jest.fn().mockResolvedValue(undefined) };
  const activity = { record: jest.fn().mockResolvedValue(undefined) };
  return { service: new TemplatesService(prisma as never, goals as never, activity as never), prisma, goals, activity, template };
}

describe('TemplatesService', () => {
  it('lists official templates and only templates owned by the authenticated user', async () => {
    const { service, prisma } = setup();
    const templates = await service.list('user-a');
    expect(prisma.goalTemplate.findMany).toHaveBeenCalledWith({ where: { ownerUserId: 'user-a' }, orderBy: { updatedAt: 'desc' } });
    expect(templates.filter((template) => template.isOfficial)).toHaveLength(6);
    expect(templates.find((template) => template.id === TEMPLATE_ID)).toMatchObject({ tags: ['planejamento'], steps: ['Etapa 1', 'Etapa 2'] });
  });

  it('creates a personal template only from an accessible goal and preserves category, tags, and steps', async () => {
    const { service, prisma, goals } = setup();
    await service.createFromGoal('user-a', GOAL_ID, { name: '  Modelo  ', customCategory: ' Casa ', tags: [' foco '], steps: [' Preparar ', 'Executar'] });
    expect(goals.get).toHaveBeenCalledWith('user-a', GOAL_ID);
    expect(prisma.goalTemplate.create).toHaveBeenCalledWith({ data: { ownerUserId: 'user-a', name: 'Modelo', description: null, categoryId: undefined, customCategory: 'Casa', tagsJson: '[" foco "]', stepsJson: '[" Preparar ","Executar"]' } });

    goals.get.mockRejectedValueOnce(new NotFoundException());
    await expect(service.createFromGoal('outsider', GOAL_ID, { name: 'Tentativa' })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.goalTemplate.create).toHaveBeenCalledTimes(1);
  });

  it('rejects conflicting standard and custom categories', async () => {
    const { service, goals, prisma } = setup();
    await expect(service.createFromGoal('user-a', GOAL_ID, { name: 'Inválido', categoryId: 'category-a', customCategory: 'Outra' })).rejects.toBeInstanceOf(BadRequestException);
    expect(goals.get).toHaveBeenCalled();
    expect(prisma.goalTemplate.create).not.toHaveBeenCalled();
  });

  it('uses an official template with reviewed dates and creates the template steps in order', async () => {
    const { service, goals, activity } = setup();
    goals.get.mockResolvedValue({ id: 'new-goal', steps: [] });
    await service.use('user-a', 'official:trip', { startDate: '2026-10-01', endDate: '2026-10-10' });
    expect(goals.create).toHaveBeenCalledWith('user-a', expect.objectContaining({ name: 'Planejar uma viagem', startDate: '2026-10-01', endDate: '2026-10-10', tags: [], teamId: undefined }));
    expect(goals.addStep.mock.calls.map((call) => call[2].title)).toEqual(['Definir destino', 'Estimar orçamento', 'Reservar transporte']);
    expect(activity.record).toHaveBeenCalledWith('user-a', 'template_used', { goalId: 'new-goal' }, { templateId: 'official:trip' });
  });

  it('scopes personal template use and deletion to its owner', async () => {
    const { service, prisma, goals } = setup();
    prisma.goalTemplate.findFirst.mockResolvedValue(null);
    await expect(service.use('user-b', TEMPLATE_ID, { startDate: '2026-10-01' })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.goalTemplate.findFirst).toHaveBeenCalledWith({ where: { id: TEMPLATE_ID, ownerUserId: 'user-b' } });
    expect(goals.create).not.toHaveBeenCalled();
    await expect(service.remove('user-b', TEMPLATE_ID)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.goalTemplate.delete).not.toHaveBeenCalled();
  });

  it('deletes the owner’s personal template but cannot delete an official template', async () => {
    const { service, prisma } = setup();
    await expect(service.remove('user-a', TEMPLATE_ID)).resolves.toEqual({ deleted: true });
    expect(prisma.goalTemplate.delete).toHaveBeenCalledWith({ where: { id: TEMPLATE_ID } });
    prisma.goalTemplate.findFirst.mockResolvedValueOnce(null);
    await expect(service.remove('user-a', 'official:trip')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
