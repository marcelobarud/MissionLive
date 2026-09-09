import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GoalsModule } from '../goals/goals.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PushModule } from '../push/push.module';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';

@Module({ imports: [AuthModule, GoalsModule, NotificationsModule, PushModule], controllers: [RemindersController], providers: [RemindersService] })
export class RemindersModule {}
