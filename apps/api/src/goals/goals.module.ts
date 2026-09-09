import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ActivityModule } from '../activity/activity.module';
import { CategoriesController } from './categories.controller';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';
import { GOAL_PHOTO_STORAGE, LocalGoalPhotoStorage } from './goal-photo-storage';

@Module({ imports: [AuthModule, ActivityModule], controllers: [GoalsController, CategoriesController], providers: [GoalsService, { provide: GOAL_PHOTO_STORAGE, useClass: LocalGoalPhotoStorage }], exports: [GoalsService] })
export class GoalsModule {}
