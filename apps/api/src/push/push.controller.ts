import { Body, Controller, Delete, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { PushSubscriptionDto, RemovePushSubscriptionDto } from './push.dto';
import { PushService } from './push.service';

@Controller('push') @UseGuards(AuthGuard)
export class PushController {
  constructor(private readonly push: PushService) {}
  @Get('public-key') publicKey() { return this.push.getPublicKey(); }
  @Post('subscriptions') subscribe(@Req() req: AuthenticatedRequest, @Body() dto: PushSubscriptionDto) { return this.push.subscribe(req.user.id, dto); }
  @Delete('subscriptions') unsubscribe(@Req() req: AuthenticatedRequest, @Body() dto: RemovePushSubscriptionDto) { return this.push.unsubscribe(req.user.id, dto.endpoint); }
}
