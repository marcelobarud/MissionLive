import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto, TokenDto } from './auth.dto';
import { AuthenticatedRequest } from './auth.types';
import { GoogleOAuthService } from './google-oauth.service';
import { UpdateProfileDto } from './profile.dto';
import { PERSISTENT_SESSION_TTL_MILLISECONDS } from './session-policy';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly config: ConfigService, private readonly googleOAuth: GoogleOAuthService) {}
  private setCookie(response: Response, token: string, expiresAt: Date, persistent: boolean) {
    const name = this.config.get('SESSION_COOKIE_NAME') ?? 'missionlive_session'; const base = { httpOnly: true, secure: this.config.get('NODE_ENV') === 'production', sameSite: 'lax' as const, path: '/' };
    if (persistent) response.cookie(name, token, { ...base, expires: expiresAt, maxAge: Math.min(PERSISTENT_SESSION_TTL_MILLISECONDS, Math.max(0, expiresAt.getTime() - Date.now())) });
    else response.cookie(name, token, base);
  }
  @Post('register') async register(@Body() dto: RegisterDto) { return this.auth.register(dto); }
  @Post('login') @HttpCode(HttpStatus.OK) async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) { const result = await this.auth.login(dto); this.setCookie(response, result.token, result.expiresAt, result.rememberMe); return { user: result.user, expiresAt: result.expiresAt }; }
  @Post('logout') @UseGuards(AuthGuard) @HttpCode(HttpStatus.NO_CONTENT) async logout(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: Response) { await this.auth.logout(request.sessionId); response.clearCookie(this.config.get('SESSION_COOKIE_NAME') ?? 'missionlive_session', { httpOnly: true, secure: this.config.get('NODE_ENV') === 'production', sameSite: 'lax', path: '/' }); }
  @Get('me') @UseGuards(AuthGuard) me(@Req() request: AuthenticatedRequest) { return { user: request.user }; }
  @Patch('profile') @UseGuards(AuthGuard) profile(@Req() request: AuthenticatedRequest, @Body() dto: UpdateProfileDto) { return this.auth.updateProfile(request.user.id, dto); }
  @Post('onboarding/complete') @UseGuards(AuthGuard) onboarding(@Req() request: AuthenticatedRequest) { return this.auth.completeOnboarding(request.user.id); }
  @Get('sessions') @UseGuards(AuthGuard) sessions(@Req() request: AuthenticatedRequest) { return this.auth.sessions(request.user.id, request.sessionId); }
  @Post('sessions/revoke-others') @UseGuards(AuthGuard) revokeOtherSessions(@Req() request: AuthenticatedRequest) { return this.auth.revokeOtherSessions(request.user.id, request.sessionId); }
  @Post('verify-email') @HttpCode(HttpStatus.OK) verify(@Body() dto: TokenDto) { return this.auth.verifyEmail(dto.token); }
  @Post('forgot-password') @HttpCode(HttpStatus.ACCEPTED) forgot(@Body() dto: ForgotPasswordDto) { return this.auth.requestPasswordReset(dto.email); }
  @Post('reset-password') reset(@Body() dto: ResetPasswordDto) { return this.auth.resetPassword(dto); }
  @Get('google') google(@Query('rememberMe') rememberMe: string | undefined, @Res() response: Response) { const result = this.googleOAuth.authorizationUrl(rememberMe === 'true'); return response.redirect(result.url); }
  @Get('google/callback') async googleCallback(@Query('code') code: string | undefined, @Query('state') state: string | undefined, @Res({ passthrough: true }) response: Response) { const result = await this.googleOAuth.callback(code, state); this.setCookie(response, result.token, result.expiresAt, result.rememberMe); return { user: result.user, expiresAt: result.expiresAt }; }
}
