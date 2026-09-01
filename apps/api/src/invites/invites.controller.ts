import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { CreateInviteDto, InviteTokenDto } from './invites.dto';
import { InvitesService } from './invites.service';

@Controller('invites')
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}
  @Get(':token') preview(@Param('token') token: string) { return this.invites.preview(token); }
  @Post() @UseGuards(AuthGuard) create(@Req() req: AuthenticatedRequest, @Body() dto: CreateInviteDto) { return this.invites.create(req.user.id, dto); }
  @Post('accept') @UseGuards(AuthGuard) accept(@Req() req: AuthenticatedRequest, @Body() dto: InviteTokenDto) { return this.invites.accept(req.user.id, dto.token); }
  @Post(':inviteId/revoke') @UseGuards(AuthGuard) revoke(@Req() req: AuthenticatedRequest, @Param('inviteId') inviteId: string) { return this.invites.revoke(req.user.id, inviteId); }
}
