import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { CreateTemplateDto, UseTemplateDto } from './templates.dto';
import { TemplatesService } from './templates.service';

@Controller('templates') @UseGuards(AuthGuard)
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}
  @Get() list(@Req() req: AuthenticatedRequest) { return this.templates.list(req.user.id); }
  @Post('from-goal/:goalId') createFromGoal(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string, @Body() dto: CreateTemplateDto) { return this.templates.createFromGoal(req.user.id, goalId, dto); }
  @Post(':templateId/use') use(@Req() req: AuthenticatedRequest, @Param('templateId') templateId: string, @Body() dto: UseTemplateDto) { return this.templates.use(req.user.id, templateId, dto); }
  @Delete(':templateId') remove(@Req() req: AuthenticatedRequest, @Param('templateId') templateId: string) { return this.templates.remove(req.user.id, templateId); }
}
