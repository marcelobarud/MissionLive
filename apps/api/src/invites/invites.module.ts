import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GoalsModule } from '../goals/goals.module';
import { ActivityModule } from '../activity/activity.module';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';

@Module({ imports: [AuthModule, GoalsModule, ActivityModule], controllers: [InvitesController], providers: [InvitesService] })
export class InvitesModule {}
