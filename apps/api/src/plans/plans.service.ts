import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}
  async current(userId: string) { const subscription = await this.prisma.subscription.findFirst({ where: { userId, status: 'active' }, include: { plan: true }, orderBy: { createdAt: 'desc' } }); const plan = subscription?.plan ?? await this.prisma.plan.findUnique({ where: { code: 'development' } }); return { plan: plan ? { code: plan.code, name: plan.name, limits: JSON.parse(plan.limitsJson || '{}') } : null, subscription: subscription ? { status: subscription.status, currentPeriodEnd: subscription.currentPeriodEnd } : null }; }
  async hasEntitlement(userId: string, key: string) { const current = await this.current(userId); return Boolean(current.plan?.limits && (current.plan.limits as Record<string, unknown>)[key]); }
}
