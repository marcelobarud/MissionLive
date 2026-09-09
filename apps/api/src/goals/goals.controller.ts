import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { CreateGoalDto, CreateGoalPhotoDto, CreateStepDto, ListGoalPhotosQueryDto, ListGoalsQueryDto, OverrideGoalDto, ProgressDto, ReorderStepsDto, UpdateGoalDto, UpdateMemberRoleDto, UpdateStepDto } from './goals.dto';
import { GoalsService } from './goals.service';

@Controller('goals') @UseGuards(AuthGuard)
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}
  @Get() list(@Req() req: AuthenticatedRequest, @Query() query: ListGoalsQueryDto) { return this.goals.list(req.user.id, query); }
  @Post() create(@Req() req: AuthenticatedRequest, @Body() dto: CreateGoalDto) { return this.goals.create(req.user.id, dto); }
  @Get(':goalId') get(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string) { return this.goals.get(req.user.id, goalId); }
  @Patch(':goalId') update(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string, @Body() dto: UpdateGoalDto) { return this.goals.update(req.user.id, goalId, dto); }
  @Delete(':goalId') remove(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string) { return this.goals.hardDelete(req.user.id, goalId); }
  @Patch(':goalId/cancel') cancel(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string) { return this.goals.cancel(req.user.id, goalId); }
  @Patch(':goalId/archive') archive(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string) { return this.goals.archive(req.user.id, goalId); }
  @Post(':goalId/override') override(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string, @Body() dto: OverrideGoalDto) { return this.goals.override(req.user.id, goalId, dto); }
  @Get(':goalId/photos') photos(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string, @Query() query: ListGoalPhotosQueryDto) { return this.goals.listPhotos(req.user.id, goalId, query); }
  @Post(':goalId/photos') @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } })) addPhoto(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string, @Body() dto: CreateGoalPhotoDto, @UploadedFile() file: Express.Multer.File) { return this.goals.addPhoto(req.user.id, goalId, dto, file); }
  @Delete(':goalId/photos/:photoId') removePhoto(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string, @Param('photoId') photoId: string) { return this.goals.removePhoto(req.user.id, goalId, photoId); }
  @Get(':goalId/photos/:photoId/:variant') media(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string, @Param('photoId') photoId: string, @Param('variant') variant: string, @Res() response: Response) { if (variant !== 'image' && variant !== 'thumbnail') throw new BadRequestException('Variante de mídia inválida.'); return this.goals.photoMedia(req.user.id, goalId, photoId, variant === 'thumbnail').then((content) => response.type('image/webp').set('Cache-Control', 'private, max-age=300').set('X-Content-Type-Options', 'nosniff').send(content)); }
  @Get(':goalId/rhythm') rhythm(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string) { return this.goals.rhythm(req.user.id, goalId); }
  @Post(':goalId/steps') addStep(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string, @Body() dto: CreateStepDto) { return this.goals.addStep(req.user.id, goalId, dto); }
  @Patch(':goalId/steps/reorder') reorder(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string, @Body() dto: ReorderStepsDto) { return this.goals.reorderSteps(req.user.id, goalId, dto); }
  @Patch(':goalId/steps/:stepId') updateStep(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string, @Param('stepId') stepId: string, @Body() dto: UpdateStepDto) { return this.goals.updateStep(req.user.id, goalId, stepId, dto); }
  @Delete(':goalId/steps/:stepId') removeStep(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string, @Param('stepId') stepId: string) { return this.goals.removeStep(req.user.id, goalId, stepId); }
  @Put(':goalId/steps/:stepId/progress') progress(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string, @Param('stepId') stepId: string, @Body() dto: ProgressDto) { return this.goals.setProgress(req.user.id, goalId, stepId, dto); }
  @Patch(':goalId/members/:memberId') memberRole(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string, @Param('memberId') memberId: string, @Body() dto: UpdateMemberRoleDto) { return this.goals.updateMemberRole(req.user.id, goalId, memberId, dto); }
  @Delete(':goalId/members/:memberId') removeMember(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string, @Param('memberId') memberId: string) { return this.goals.removeMember(req.user.id, goalId, memberId); }
}
