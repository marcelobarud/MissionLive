import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CategoriesController } from './categories.controller';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';

@Module({ imports: [AuthModule], controllers: [GoalsController, CategoriesController], providers: [GoalsService], exports: [GoalsService] })
export class GoalsModule {}
