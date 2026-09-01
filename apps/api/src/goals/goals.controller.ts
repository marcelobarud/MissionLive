import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { CreateGoalDto, CreateStepDto, ListGoalsQueryDto, OverrideGoalDto, ProgressDto, ReorderStepsDto, UpdateGoalDto, UpdateMemberRoleDto, UpdateStepDto } from './goals.dto';
import { GoalsService } from './goals.service';

@Controller('goals') @UseGuards(AuthGuard)
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}
  @Get() list(@Req() req: AuthenticatedRequest, @Query() query: ListGoalsQueryDto) { return this.goals.list(req.user.id, query); }
  @Post() create(@Req() req: AuthenticatedRequest, @Body() dto: CreateGoalDto) { return this.goals.create(req.user.id, dto); }
  @Get(':goalId') get(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string) { return this.goals.get(req.user.id, goalId); }
  @Patch(':goalId') update(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string, @Body() dto: UpdateGoalDto) { return this.goals.update(req.user.id, goalId, dto); }
  @Delete(':goalId') remove(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string) { return this.goals.remove(req.user.id, goalId); }
  @Patch(':goalId/archive') archive(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string) { return this.goals.archive(req.user.id, goalId); }
  @Post(':goalId/override') override(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string, @Body() dto: OverrideGoalDto) { return this.goals.override(req.user.id, goalId, dto); }
  @Post(':goalId/steps') addStep(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string, @Body() dto: CreateStepDto) { return this.goals.addStep(req.user.id, goalId, dto); }
  @Patch(':goalId/steps/reorder') reorder(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string, @Body() dto: ReorderStepsDto) { return this.goals.reorderSteps(req.user.id, goalId, dto); }
  @Patch(':goalId/steps/:stepId') updateStep(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string, @Param('stepId') stepId: string, @Body() dto: UpdateStepDto) { return this.goals.updateStep(req.user.id, goalId, stepId, dto); }
  @Delete(':goalId/steps/:stepId') removeStep(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string, @Param('stepId') stepId: string) { return this.goals.removeStep(req.user.id, goalId, stepId); }
  @Put(':goalId/steps/:stepId/progress') progress(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string, @Param('stepId') stepId: string, @Body() dto: ProgressDto) { return this.goals.setProgress(req.user.id, goalId, stepId, dto); }
  @Patch(':goalId/members/:memberId') memberRole(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string, @Param('memberId') memberId: string, @Body() dto: UpdateMemberRoleDto) { return this.goals.updateMemberRole(req.user.id, goalId, memberId, dto); }
  @Delete(':goalId/members/:memberId') removeMember(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string, @Param('memberId') memberId: string) { return this.goals.removeMember(req.user.id, goalId, memberId); }
}
