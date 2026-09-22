import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GoalsModule } from '../goals/goals.module';
import { DashboardController } from './dashboard.controller';
import { DashboardReadService } from './dashboard-read.service';
import { DashboardService } from './dashboard.service';

@Module({ imports: [AuthModule, GoalsModule], controllers: [DashboardController], providers: [DashboardService, DashboardReadService] })
export class DashboardModule {}
