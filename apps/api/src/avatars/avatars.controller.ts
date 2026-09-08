import { Body, Controller, Delete, Get, Param, Patch, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { AvatarsService, MAX_AVATAR_BYTES } from './avatars.service';
import { SetAvatarPresetDto } from './avatars.dto';

@Controller()
export class AvatarsController {
  constructor(private readonly avatars: AvatarsService) {}

  @Patch('profile/avatar/preset') @UseGuards(AuthGuard)
  preset(@Req() request: AuthenticatedRequest, @Body() body: SetAvatarPresetDto) { return this.avatars.setPreset(request.user.id, body.presetId); }

  @Post('profile/avatar/upload') @UseGuards(AuthGuard) @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_AVATAR_BYTES, files: 1 } }))
  upload(@Req() request: AuthenticatedRequest, @UploadedFile() file: Express.Multer.File) { return this.avatars.upload(request.user.id, file); }

  @Delete('profile/avatar') @UseGuards(AuthGuard)
  remove(@Req() request: AuthenticatedRequest) { return this.avatars.remove(request.user.id); }

  @Get('media/avatars/:userId/:fileName')
  async media(@Param('userId') userId: string, @Param('fileName') fileName: string, @Res() response: Response) { const content = await this.avatars.read(userId, fileName); response.set({ 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable', 'Cross-Origin-Resource-Policy': 'same-site', 'X-Content-Type-Options': 'nosniff' }); return response.send(content); }
}
