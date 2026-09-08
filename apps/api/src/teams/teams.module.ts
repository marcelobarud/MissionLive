import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GoalsModule } from '../goals/goals.module';
import { ActivityModule } from '../activity/activity.module';
import { TeamsController } from './teams.controller';
import { TEAM_IMAGE_STORAGE, TeamsService } from './teams.service';
import { LocalTeamImageStorage } from './team-image-storage';

@Module({ imports: [AuthModule, GoalsModule, ActivityModule], controllers: [TeamsController], providers: [TeamsService, { provide: TEAM_IMAGE_STORAGE, useFactory: () => new LocalTeamImageStorage() }], exports: [TeamsService] })
export class TeamsModule {}
