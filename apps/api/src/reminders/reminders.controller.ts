import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { CreateReminderDto, UpdateReminderDto } from './reminders.dto';
import { RemindersService } from './reminders.service';

@Controller('reminders') @UseGuards(AuthGuard)
export class RemindersController {
  constructor(private readonly reminders: RemindersService) {}
  @Get() list(@Req() req: AuthenticatedRequest) { return this.reminders.list(req.user.id); }
  @Post() create(@Req() req: AuthenticatedRequest, @Body() dto: CreateReminderDto) { return this.reminders.create(req.user.id, dto); }
  @Patch(':reminderId') update(@Req() req: AuthenticatedRequest, @Param('reminderId') reminderId: string, @Body() dto: UpdateReminderDto) { return this.reminders.update(req.user.id, reminderId, dto); }
  @Delete(':reminderId') cancel(@Req() req: AuthenticatedRequest, @Param('reminderId') reminderId: string) { return this.reminders.cancel(req.user.id, reminderId); }
}
