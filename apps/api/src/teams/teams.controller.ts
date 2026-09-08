import { Body, Controller, Delete, Get, Param, Patch, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { CreateTeamDto, CreateTeamWithGoalDto, UpdateTeamDto, UpdateMemberRoleDto } from './teams.dto';
import { MAX_TEAM_IMAGE_BYTES, TeamsService } from './teams.service';

@Controller('teams') @UseGuards(AuthGuard)
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}
  @Get() list(@Req() req: AuthenticatedRequest) { return this.teams.list(req.user.id); }
  @Post() create(@Req() req: AuthenticatedRequest, @Body() dto: CreateTeamDto) { return this.teams.create(req.user.id, dto); }
  @Post('with-goal') createWithGoal(@Req() req: AuthenticatedRequest, @Body() dto: CreateTeamWithGoalDto) { return this.teams.createWithGoal(req.user.id, dto); }
  @Post(':teamId/image') @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_TEAM_IMAGE_BYTES, files: 1 } }))
  uploadImage(@Req() req: AuthenticatedRequest, @Param('teamId') teamId: string, @UploadedFile() file: Express.Multer.File) { return this.teams.uploadImage(req.user.id, teamId, file); }
  @Get(':teamId/image')
  async image(@Req() req: AuthenticatedRequest, @Param('teamId') teamId: string, @Res() response: Response) { const content = await this.teams.readImage(req.user.id, teamId); response.set({ 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-cache', 'Cross-Origin-Resource-Policy': 'same-site', 'X-Content-Type-Options': 'nosniff' }); return response.send(content); }
  @Delete(':teamId/image') removeImage(@Req() req: AuthenticatedRequest, @Param('teamId') teamId: string) { return this.teams.removeImage(req.user.id, teamId); }
  @Get(':teamId') get(@Req() req: AuthenticatedRequest, @Param('teamId') teamId: string) { return this.teams.get(req.user.id, teamId); }
  @Patch(':teamId') update(@Req() req: AuthenticatedRequest, @Param('teamId') teamId: string, @Body() dto: UpdateTeamDto) { return this.teams.update(req.user.id, teamId, dto); }
  @Delete(':teamId') remove(@Req() req: AuthenticatedRequest, @Param('teamId') teamId: string) { return this.teams.remove(req.user.id, teamId); }
  @Patch(':teamId/members/:memberId') updateMember(@Req() req: AuthenticatedRequest, @Param('teamId') teamId: string, @Param('memberId') memberId: string, @Body() dto: UpdateMemberRoleDto) { return this.teams.updateMember(req.user.id, teamId, memberId, dto); }
  @Delete(':teamId/members/:memberId') removeMember(@Req() req: AuthenticatedRequest, @Param('teamId') teamId: string, @Param('memberId') memberId: string) { return this.teams.removeMember(req.user.id, teamId, memberId); }
}
