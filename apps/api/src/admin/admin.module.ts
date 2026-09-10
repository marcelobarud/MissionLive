import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminAuditService } from './admin-audit.service';
import { AdminAdministratorsController } from './admin-administrators.controller';
import { AdminAdministratorsService } from './admin-administrators.service';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { AdminOverviewController } from './admin-overview.controller';
import { AdminOverviewService } from './admin-overview.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminOverviewController, AdminUsersController, AdminAdministratorsController],
  providers: [AdminAuditService, AdminBootstrapService, AdminOverviewService, AdminUsersService, AdminAdministratorsService],
  exports: [AdminAuditService, AdminBootstrapService, AdminOverviewService, AdminUsersService, AdminAdministratorsService],
})
export class AdminModule {}
