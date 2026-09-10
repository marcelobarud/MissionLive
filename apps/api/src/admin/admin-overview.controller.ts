import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { requirePlatformAdmin } from './platform-role';
import { AdminOverviewService } from './admin-overview.service';

@Controller('admin')
export class AdminOverviewController {
  constructor(private readonly overview: AdminOverviewService) {}

  @Get('overview')
  @UseGuards(AuthGuard)
  getOverview(@Req() request: AuthenticatedRequest) {
    requirePlatformAdmin(request.user);
    return this.overview.getOverview();
  }
}
