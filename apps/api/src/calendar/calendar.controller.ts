import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { CalendarQueryDto } from './calendar.dto';
import { CalendarService } from './calendar.service';

@Controller('calendar') @UseGuards(AuthGuard)
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}
  @Get() list(@Req() req: AuthenticatedRequest, @Query() query: CalendarQueryDto) { return this.calendar.list(req.user.id, query.from, query.to); }
}
