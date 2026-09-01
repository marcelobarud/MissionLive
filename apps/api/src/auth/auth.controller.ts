import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto, TokenDto } from './auth.dto';
import { AuthenticatedRequest } from './auth.types';
import { GoogleOAuthService } from './google-oauth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly config: ConfigService, private readonly googleOAuth: GoogleOAuthService) {}
  private setCookie(response: Response, token: string, expiresAt: Date) { response.cookie(this.config.get('SESSION_COOKIE_NAME') ?? 'missionlive_session', token, { httpOnly: true, secure: this.config.get('NODE_ENV') === 'production', sameSite: 'lax', expires: expiresAt, path: '/' }); }
  @Post('register') async register(@Body() dto: RegisterDto) { return this.auth.register(dto); }
  @Post('login') @HttpCode(HttpStatus.OK) async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) { const result = await this.auth.login(dto); this.setCookie(response, result.token, result.expiresAt); return { user: result.user, expiresAt: result.expiresAt }; }
  @Post('logout') @UseGuards(AuthGuard) @HttpCode(HttpStatus.NO_CONTENT) async logout(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: Response) { await this.auth.logout(request.sessionId); response.clearCookie(this.config.get('SESSION_COOKIE_NAME') ?? 'missionlive_session', { httpOnly: true, sameSite: 'lax', path: '/' }); }
  @Get('me') @UseGuards(AuthGuard) me(@Req() request: AuthenticatedRequest) { return { user: request.user }; }
  @Post('verify-email') @HttpCode(HttpStatus.OK) verify(@Body() dto: TokenDto) { return this.auth.verifyEmail(dto.token); }
  @Post('forgot-password') @HttpCode(HttpStatus.ACCEPTED) forgot(@Body() dto: ForgotPasswordDto) { return this.auth.requestPasswordReset(dto.email); }
  @Post('reset-password') reset(@Body() dto: ResetPasswordDto) { return this.auth.resetPassword(dto); }
  @Get('google') google(@Res() response: Response) { const result = this.googleOAuth.authorizationUrl(); return response.redirect(result.url); }
  @Get('google/callback') async googleCallback(@Query('code') code: string | undefined, @Query('state') state: string | undefined, @Res({ passthrough: true }) response: Response) { const result = await this.googleOAuth.callback(code, state); this.setCookie(response, result.token, result.expiresAt); return { user: result.user, expiresAt: result.expiresAt }; }
}
