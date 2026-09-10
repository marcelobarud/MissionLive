import { BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { hashToken, createToken } from './token.util';
import { RegisterDto, LoginDto, ResetPasswordDto } from './auth.dto';
import * as argon2 from 'argon2';
import { publicUser } from './user.serializer';
import { isValidIanaTimezone } from './timezone';
import { COUNTRY_CODES, BRAZILIAN_REGION_CODES } from './countries';
import { isValidCivilDate, normalizePhone } from './profile.validation';

@Injectable()
export class AuthService {
  private readonly loginAttempts = new Map<string, { count: number; resetAt: number }>();
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  private localToken(token: string) { return this.config.get('NODE_ENV') !== 'production' ? token : undefined; }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email is already registered.');
    const verificationToken = createToken();
    const user = await this.prisma.user.create({ data: { email, name: dto.name.trim(), passwordHash: await argon2.hash(dto.password), authTokens: { create: { type: 'email_verification', tokenHash: hashToken(verificationToken), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } } } });
    return { user: publicUser(user), emailVerified: false, verificationToken: this.localToken(verificationToken) };
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
    return { user: publicUser(user), token, expiresAt, sessionId: session.id };
  }

  async logout(sessionId: string) { await this.prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } }); }
  async updateProfile(userId: string, dto: import('./profile.dto').UpdateProfileDto) {
    if (dto.timezone !== undefined && !isValidIanaTimezone(dto.timezone)) throw new BadRequestException('Invalid IANA timezone.');
    const current = await this.prisma.user.findUnique({ where: { id: userId } }); if (!current) throw new UnauthorizedException('User not found.');
    const requestedCountry = dto.countryCode !== undefined ? dto.countryCode?.trim().toUpperCase() || null : current.countryCode;
    const countryChanged = dto.countryCode !== undefined && requestedCountry !== current.countryCode;
    const countryCode = requestedCountry;
    const region = dto.region !== undefined ? dto.region?.trim() || null : countryChanged ? null : current.region;
    const city = dto.city !== undefined ? dto.city?.trim() || null : countryChanged ? null : current.city;
    if (countryCode && !COUNTRY_CODES.has(countryCode)) throw new BadRequestException('Selecione um país válido.');
    if (dto.birthDate && !isValidCivilDate(dto.birthDate)) throw new BadRequestException('Informe uma data de nascimento válida.');
    if (countryCode === 'BR' && region && !BRAZILIAN_REGION_CODES.has(region)) throw new BadRequestException('Informe uma UF brasileira válida.');
    if (city && !countryCode) throw new BadRequestException('Selecione um país para informar a cidade.');
    const user = await this.prisma.user.update({ where: { id: userId }, data: {
      name: dto.name?.trim(), avatarUrl: dto.avatarUrl, timezone: dto.timezone?.trim(), preferencesJson: dto.preferences ? JSON.stringify(dto.preferences) : undefined,
      phone: dto.phone === undefined ? undefined : dto.phone === null ? null : normalizePhone(dto.phone.trim()), birthDate: dto.birthDate === undefined ? undefined : dto.birthDate, countryCode: dto.countryCode === undefined ? undefined : countryCode,
      region: dto.region === undefined && !countryChanged ? undefined : region, city: dto.city === undefined && !countryChanged ? undefined : city,
    } }); return publicUser(user);
  }
  async completeOnboarding(userId: string) { const user = await this.prisma.user.update({ where: { id: userId }, data: { onboardingCompletedAt: new Date() } }); return publicUser(user); }
  async sessions(userId: string, currentSessionId: string) { return this.prisma.session.findMany({ where: { userId, revokedAt: null }, select: { id: true, createdAt: true, expiresAt: true }, orderBy: { createdAt: 'desc' } }).then((items) => items.map((item) => ({ ...item, current: item.id === currentSessionId }))); }
  async revokeOtherSessions(userId: string, currentSessionId: string) { await this.prisma.session.updateMany({ where: { userId, revokedAt: null, id: { not: currentSessionId } }, data: { revokedAt: new Date() } }); return { revoked: true }; }
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
