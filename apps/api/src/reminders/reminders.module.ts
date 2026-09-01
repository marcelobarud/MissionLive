import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GoalsModule } from '../goals/goals.module';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';

@Module({ imports: [AuthModule, GoalsModule], controllers: [RemindersController], providers: [RemindersService] })
export class RemindersModule {}
