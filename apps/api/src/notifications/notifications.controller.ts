import { Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { NotificationsService } from './notifications.service';

@Controller('notifications') @UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get() list(@Req() req: AuthenticatedRequest) { return this.notifications.list(req.user.id); }
  @Get('unread-count') unreadCount(@Req() req: AuthenticatedRequest) { return this.notifications.unreadCount(req.user.id); }
  @Patch(':id/read') read(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.notifications.markRead(req.user.id, id); }
  @Post('read-all') readAll(@Req() req: AuthenticatedRequest) { return this.notifications.markAllRead(req.user.id); }
}
