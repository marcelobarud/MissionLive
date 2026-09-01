import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { DashboardService } from './dashboard.service';

@Controller('dashboard') @UseGuards(AuthGuard)
export class DashboardController { constructor(private readonly dashboard: DashboardService) {} @Get() summary(@Req() req: AuthenticatedRequest) { return this.dashboard.summary(req.user.id); } }
