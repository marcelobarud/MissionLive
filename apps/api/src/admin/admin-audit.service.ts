import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformAuditAction } from './platform-role';

type AuditMetadata = Record<string, string | number | boolean | null>;

export type AdminAuditInput = {
  actorUserId?: string | null;
  action: PlatformAuditAction;
  targetUserId?: string | null;
  metadata?: AuditMetadata | null;
};

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AdminAuditInput, client: PrismaService | Prisma.TransactionClient = this.prisma) {
    return client.adminAuditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        targetUserId: input.targetUserId ?? null,
        metadataJson: input.metadata === undefined || input.metadata === null ? null : JSON.stringify(input.metadata),
      },
    });
  }
}
