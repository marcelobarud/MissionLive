import { ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { hashToken, createToken } from './token.util';
import { AuthUser } from './auth.types';
import { RegisterDto, LoginDto, ResetPasswordDto } from './auth.dto';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  private readonly loginAttempts = new Map<string, { count: number; resetAt: number }>();
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  private publicUser(user: { id: string; email: string; name: string; timezone?: string }): AuthUser { return { id: user.id, email: user.email, name: user.name, timezone: user.timezone }; }
  private localToken(token: string) { return this.config.get('NODE_ENV') !== 'production' ? token : undefined; }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email is already registered.');
    const verificationToken = createToken();
    const user = await this.prisma.user.create({ data: { email, name: dto.name.trim(), passwordHash: await argon2.hash(dto.password), authTokens: { create: { type: 'email_verification', tokenHash: hashToken(verificationToken), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } } } });
    return { user: this.publicUser(user), emailVerified: false, verificationToken: this.localToken(verificationToken) };
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase(); const now = Date.now(); const attempt = this.loginAttempts.get(email);
    if (attempt && attempt.resetAt > now && attempt.count >= 10) throw new HttpException('Too many login attempts. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || !(await argon2.verify(user.passwordHash, dto.password))) { const current = attempt && attempt.resetAt > now ? attempt : { count: 0, resetAt: now + 15 * 60 * 1000 }; this.loginAttempts.set(email, { count: current.count + 1, resetAt: current.resetAt }); throw new UnauthorizedException('Invalid email or password.'); }
    if (user.status !== 'active') throw new ForbiddenException('User account is disabled.');
    if (!user.emailVerifiedAt) throw new ForbiddenException('Verify your email before signing in.');
    this.loginAttempts.delete(email); return this.startSession(user);
  }

  async startSession(user: { id: string; email: string; name: string }) {
    const token = createToken();
    const ttlDays = Number(this.config.get('SESSION_TTL_DAYS') ?? 30);
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
    const session = await this.prisma.session.create({ data: { userId: user.id, refreshTokenHash: hashToken(token), expiresAt } });
    return { user: this.publicUser(user), token, expiresAt, sessionId: session.id };
  }

  async logout(sessionId: string) { await this.prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } }); }
  async verifyEmail(token: string) {
    const record = await this.prisma.authToken.findFirst({ where: { type: 'email_verification', tokenHash: hashToken(token), consumedAt: null, expiresAt: { gt: new Date() } } });
    if (!record) throw new UnauthorizedException('Verification token is invalid or expired.');
    await this.prisma.$transaction([this.prisma.authToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } }), this.prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } })]);
    return { verified: true };
  }
  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user) return { accepted: true };
    const token = createToken();
    await this.prisma.authToken.create({ data: { userId: user.id, type: 'password_reset', tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
    return { accepted: true, resetToken: this.localToken(token) };
  }
  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.prisma.authToken.findFirst({ where: { type: 'password_reset', tokenHash: hashToken(dto.token), consumedAt: null, expiresAt: { gt: new Date() } } });
    if (!record) throw new UnauthorizedException('Reset token is invalid or expired.');
    await this.prisma.$transaction([this.prisma.authToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } }), this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await argon2.hash(dto.password), emailVerifiedAt: new Date() } }), this.prisma.session.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } })]);
    return { reset: true };
  }
}
