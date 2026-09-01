import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { PlansService } from './plans.service';

@Controller('plans') @UseGuards(AuthGuard)
export class PlansController { constructor(private readonly plans: PlansService) {} @Get('current') current(@Req() req: AuthenticatedRequest) { return this.plans.current(req.user.id); } }
