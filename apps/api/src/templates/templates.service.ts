import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoalsService } from '../goals/goals.service';
import { ActivityService } from '../activity/activity.service';
import { CreateTemplateDto, UseTemplateDto } from './templates.dto';

const OFFICIAL = [
  { id: 'official:trip', name: 'Planejar uma viagem', description: 'Organize destinos, reservas e próximos passos.', steps: ['Definir destino', 'Estimar orçamento', 'Reservar transporte'] },
  { id: 'official:run5k', name: 'Correr 5 km', description: 'Construir consistência para correr 5 km.', steps: ['Definir rotina', 'Treinar três vezes', 'Registrar evolução'] },
  { id: 'official:finance', name: 'Reserva financeira', description: 'Criar uma reserva com pequenos avanços.', steps: ['Definir valor-alvo', 'Organizar orçamento', 'Agendar primeiro aporte'] },
  { id: 'official:books', name: 'Ler livros', description: 'Transformar leitura em uma rotina possível.', steps: ['Escolher livros', 'Definir frequência', 'Registrar aprendizados'] },
  { id: 'official:home', name: 'Reforma da casa', description: 'Dar clareza à próxima etapa da reforma.', steps: ['Listar necessidades', 'Definir orçamento', 'Contratar apoio'] },
  { id: 'official:event', name: 'Planejar evento', description: 'Organizar um evento sem perder o fio.', steps: ['Definir objetivo', 'Montar lista', 'Confirmar fornecedores'] },
];

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService, private readonly goals: GoalsService, private readonly activity: ActivityService) {}
  async list(userId: string) {
    const own = await this.prisma.goalTemplate.findMany({ where: { ownerUserId: userId }, orderBy: { updatedAt: 'desc' } });
    return [...OFFICIAL.map((template) => ({ ...template, isOfficial: true })), ...own.map((template) => ({ ...template, tags: JSON.parse(template.tagsJson || '[]') as string[], steps: JSON.parse(template.stepsJson || '[]') as string[] }))];
  }
  async createFromGoal(userId: string, goalId: string, dto: CreateTemplateDto) {
    const goal = await this.goals.get(userId, goalId);
    if (dto.categoryId && dto.customCategory) throw new BadRequestException('Choose a standard category or custom category, not both.');
    const template = await this.prisma.goalTemplate.create({ data: { ownerUserId: userId, name: dto.name.trim(), description: dto.description?.trim() || null, categoryId: dto.categoryId, customCategory: dto.customCategory?.trim() || null, tagsJson: JSON.stringify(dto.tags ?? goal.tags), stepsJson: JSON.stringify(dto.steps ?? goal.steps.map((step) => step.title)) } });
    await this.activity.record(userId, 'template_created', { goalId }); return template;
  }
  async use(userId: string, templateId: string, dto: UseTemplateDto) {
    const template = templateId.startsWith('official:') ? OFFICIAL.find((item) => item.id === templateId) : await this.prisma.goalTemplate.findFirst({ where: { id: templateId, ownerUserId: userId } });
    if (!template) throw new NotFoundException('Template not found.');
    const tags: string[] = 'tags' in template ? (template.tags as string[]) : JSON.parse((template as { tagsJson: string }).tagsJson || '[]') as string[];
    const steps: string[] = 'steps' in template ? (template.steps as string[]) : JSON.parse((template as { stepsJson: string }).stepsJson || '[]') as string[];
    const categoryId = 'categoryId' in template ? template.categoryId ?? undefined : undefined;
    const customCategory = 'customCategory' in template ? template.customCategory ?? undefined : undefined;
    const goal = await this.goals.create(userId, { name: template.name, description: template.description ?? undefined, categoryId, customCategory, tags, startDate: dto.startDate, endDate: dto.endDate, teamId: dto.teamId });
    for (const title of steps) await this.goals.addStep(userId, goal.id, { title });
    await this.activity.record(userId, 'template_used', { goalId: goal.id }, { templateId }); return this.goals.get(userId, goal.id);
  }
  async remove(userId: string, templateId: string) { const template = await this.prisma.goalTemplate.findFirst({ where: { id: templateId, ownerUserId: userId } }); if (!template) throw new ForbiddenException('You cannot remove this template.'); await this.prisma.goalTemplate.delete({ where: { id: templateId } }); return { deleted: true }; }
}
