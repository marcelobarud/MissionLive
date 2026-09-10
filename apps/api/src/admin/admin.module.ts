import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminAuditService } from './admin-audit.service';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { AdminOverviewController } from './admin-overview.controller';
import { AdminOverviewService } from './admin-overview.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminOverviewController, AdminUsersController],
  providers: [AdminAuditService, AdminBootstrapService, AdminOverviewService, AdminUsersService],
  exports: [AdminAuditService, AdminBootstrapService, AdminOverviewService, AdminUsersService],
})
export class AdminModule {}
