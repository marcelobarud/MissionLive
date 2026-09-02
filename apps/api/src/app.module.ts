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
import { RemindersModule } from './reminders/reminders.module';
import { ActivityModule } from './activity/activity.module';
import { CommentsModule } from './comments/comments.module';
import { TemplatesModule } from './templates/templates.module';
import { CalendarModule } from './calendar/calendar.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AvatarsModule } from './avatars/avatars.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }), PrismaModule, AuthModule, AvatarsModule, GoalsModule, TeamsModule, InvitesModule, DashboardModule, PlansModule, RemindersModule, ActivityModule, CommentsModule, TemplatesModule, CalendarModule, NotificationsModule],
  controllers: [HealthController],
})
export class AppModule {}
