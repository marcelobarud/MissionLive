import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { ActivityService } from './activity.service';
import { ActivityListQueryDto } from './activity.dto';

@Controller('activity') @UseGuards(AuthGuard)
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}
  @Get() list(@Req() req: AuthenticatedRequest, @Query() query: ActivityListQueryDto) { return this.activity.list(req.user.id, query); }
}
