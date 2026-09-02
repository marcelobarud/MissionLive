import { Module } from '@nestjs/common';
import { AvatarsController } from './avatars.controller';
import { AVATAR_STORAGE, AvatarsService } from './avatars.service';
import { LocalAvatarStorage } from './avatar-storage';

@Module({ controllers: [AvatarsController], providers: [AvatarsService, { provide: AVATAR_STORAGE, useFactory: () => new LocalAvatarStorage() }] })
export class AvatarsModule {}
