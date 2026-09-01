import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { ActivityService } from './activity.service';

@Controller('activity') @UseGuards(AuthGuard)
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}
  @Get() list(@Req() req: AuthenticatedRequest, @Query('limit') limit?: string) { return this.activity.list(req.user.id, limit); }
}
