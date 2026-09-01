import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedRequest } from './auth.types';
import { hashToken } from './token.util';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.[this.config.get('SESSION_COOKIE_NAME') ?? 'missionlive_session'] as string | undefined;
    if (!token) throw new UnauthorizedException('Authentication required.');
    const session = await this.prisma.session.findFirst({ where: { refreshTokenHash: hashToken(token), revokedAt: null, expiresAt: { gt: new Date() } }, include: { user: true } });
    if (!session || session.user.status !== 'active') throw new UnauthorizedException('Session is invalid or expired.');
    request.user = { id: session.user.id, email: session.user.email, name: session.user.name, timezone: session.user.timezone };
    request.sessionId = session.id;
    return true;
  }
}
