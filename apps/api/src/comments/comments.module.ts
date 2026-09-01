import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GoalsModule } from '../goals/goals.module';
import { ActivityModule } from '../activity/activity.module';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({ imports: [AuthModule, GoalsModule, ActivityModule], controllers: [CommentsController], providers: [CommentsService] })
export class CommentsModule {}
