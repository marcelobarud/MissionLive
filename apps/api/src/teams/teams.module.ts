import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GoalsModule } from '../goals/goals.module';
import { ActivityModule } from '../activity/activity.module';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({ imports: [AuthModule, GoalsModule, ActivityModule], controllers: [TeamsController], providers: [TeamsService], exports: [TeamsService] })
export class TeamsModule {}
