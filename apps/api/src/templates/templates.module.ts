import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GoalsModule } from '../goals/goals.module';
import { ActivityModule } from '../activity/activity.module';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';

@Module({ imports: [AuthModule, GoalsModule, ActivityModule], controllers: [TemplatesController], providers: [TemplatesService] })
export class TemplatesModule {}
