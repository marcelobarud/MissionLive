import { Module } from '@nestjs/common';
import { AdminAuditService } from './admin-audit.service';
import { AdminBootstrapService } from './admin-bootstrap.service';

@Module({ providers: [AdminAuditService, AdminBootstrapService], exports: [AdminAuditService, AdminBootstrapService] })
export class AdminModule {}
