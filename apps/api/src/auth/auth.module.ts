import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { GoogleOAuthService } from './google-oauth.service';

@Module({ controllers: [AuthController], providers: [AuthService, AuthGuard, GoogleOAuthService], exports: [AuthGuard, AuthService] })
export class AuthModule {}
