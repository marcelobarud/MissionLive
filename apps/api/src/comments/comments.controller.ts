import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { CommentsService } from './comments.service';
import { CreateCommentDto, ReactionDto, UpdateCommentDto } from './comments.dto';

@Controller() @UseGuards(AuthGuard)
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}
  @Get('goals/:goalId/comments') list(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string, @Query('limit') limit?: string) { return this.comments.list(req.user.id, goalId, limit); }
  @Post('goals/:goalId/comments') create(@Req() req: AuthenticatedRequest, @Param('goalId') goalId: string, @Body() dto: CreateCommentDto) { return this.comments.create(req.user.id, goalId, dto.body); }
  @Patch('comments/:commentId') update(@Req() req: AuthenticatedRequest, @Param('commentId') commentId: string, @Body() dto: UpdateCommentDto) { return this.comments.update(req.user.id, commentId, dto.body); }
  @Delete('comments/:commentId') remove(@Req() req: AuthenticatedRequest, @Param('commentId') commentId: string) { return this.comments.remove(req.user.id, commentId); }
  @Put('comments/:commentId/reactions') reaction(@Req() req: AuthenticatedRequest, @Param('commentId') commentId: string, @Body() dto: ReactionDto) { return this.comments.toggleReaction(req.user.id, commentId, dto.emoji); }
}
