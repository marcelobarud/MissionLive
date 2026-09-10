import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuditService } from './admin-audit.service';
import { PLATFORM_AUDIT_ACTIONS } from './platform-role';

@Injectable()
export class AdminBootstrapService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AdminAuditService) {}

  async bootstrapSuperAdmin(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) throw new NotFoundException('Informe o e-mail do usuário que receberá o primeiro acesso administrativo.');

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { email: normalizedEmail } });
      if (!user) throw new NotFoundException('Usuário não encontrado para o bootstrap administrativo.');
      if (user.platformRole === 'SUPER_ADMIN') return { promoted: false, userId: user.id, email: user.email, platformRole: user.platformRole };

      const updated = await tx.user.update({ where: { id: user.id }, data: { platformRole: 'SUPER_ADMIN' } });
      await this.audit.record({ action: PLATFORM_AUDIT_ACTIONS.SUPER_ADMIN_BOOTSTRAPPED, targetUserId: updated.id, metadata: { source: 'explicit-bootstrap' } }, tx);
      return { promoted: true, userId: updated.id, email: updated.email, platformRole: updated.platformRole };
    });
  }
}
