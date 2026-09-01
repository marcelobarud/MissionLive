import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { CreateTeamDto, UpdateTeamDto, UpdateMemberRoleDto } from './teams.dto';
import { TeamsService } from './teams.service';

@Controller('teams') @UseGuards(AuthGuard)
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}
  @Get() list(@Req() req: AuthenticatedRequest) { return this.teams.list(req.user.id); }
  @Post() create(@Req() req: AuthenticatedRequest, @Body() dto: CreateTeamDto) { return this.teams.create(req.user.id, dto); }
  @Get(':teamId') get(@Req() req: AuthenticatedRequest, @Param('teamId') teamId: string) { return this.teams.get(req.user.id, teamId); }
  @Patch(':teamId') update(@Req() req: AuthenticatedRequest, @Param('teamId') teamId: string, @Body() dto: UpdateTeamDto) { return this.teams.update(req.user.id, teamId, dto); }
  @Delete(':teamId') remove(@Req() req: AuthenticatedRequest, @Param('teamId') teamId: string) { return this.teams.remove(req.user.id, teamId); }
  @Patch(':teamId/members/:memberId') updateMember(@Req() req: AuthenticatedRequest, @Param('teamId') teamId: string, @Param('memberId') memberId: string, @Body() dto: UpdateMemberRoleDto) { return this.teams.updateMember(req.user.id, teamId, memberId, dto); }
  @Delete(':teamId/members/:memberId') removeMember(@Req() req: AuthenticatedRequest, @Param('teamId') teamId: string, @Param('memberId') memberId: string) { return this.teams.removeMember(req.user.id, teamId, memberId); }
}
