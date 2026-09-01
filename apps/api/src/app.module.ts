import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { validateEnvironment } from './config/env.validation';
import { AuthModule } from './auth/auth.module';
import { GoalsModule } from './goals/goals.module';
import { TeamsModule } from './teams/teams.module';
import { InvitesModule } from './invites/invites.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PlansModule } from './plans/plans.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }), PrismaModule, AuthModule, GoalsModule, TeamsModule, InvitesModule, DashboardModule, PlansModule],
  controllers: [HealthController],
})
export class AppModule {}
