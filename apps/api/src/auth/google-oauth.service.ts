import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

type GoogleProfile = { sub?: string; email?: string; name?: string; picture?: string; email_verified?: boolean };

@Injectable()
export class GoogleOAuthService {
  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService, private readonly auth: AuthService) {}
  private required(name: string) { const value = this.config.get<string>(name); if (!value) throw new ServiceUnavailableException('Google OAuth is not configured.'); return value; }
  private sign(payload: string) { return createHmac('sha256', this.required('SESSION_SECRET')).update(payload).digest('base64url'); }
  private state(rememberMe = false) { const payload = JSON.stringify({ verifier: randomBytes(32).toString('base64url'), nonce: randomBytes(24).toString('base64url'), issuedAt: Date.now(), rememberMe }); const encoded = Buffer.from(payload).toString('base64url'); return `${encoded}.${this.sign(encoded)}`; }
  private readState(value: string) { const [encoded, signature] = value.split('.'); if (!encoded || !signature) throw new BadRequestException('Invalid OAuth state.'); const expected = Buffer.from(this.sign(encoded)); const actual = Buffer.from(signature); if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new BadRequestException('Invalid OAuth state.'); let payload: { verifier: string; nonce: string; issuedAt: number; rememberMe?: boolean }; try { payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as typeof payload; } catch { throw new BadRequestException('Invalid OAuth state.'); } if (Date.now() - payload.issuedAt > 10 * 60 * 1000) throw new BadRequestException('OAuth state expired.'); return payload; }
  authorizationUrl(rememberMe = false) { const clientId = this.required('GOOGLE_CLIENT_ID'); const callback = this.required('GOOGLE_CALLBACK_URL'); const state = this.state(rememberMe); const encodedState = Buffer.from(state.split('.')[0], 'base64url').toString(); const verifier = (JSON.parse(encodedState) as { verifier: string }).verifier; const challenge = createHash('sha256').update(verifier).digest('base64url'); const query = new URLSearchParams({ client_id: clientId, redirect_uri: callback, response_type: 'code', scope: 'openid email profile', state, code_challenge: challenge, code_challenge_method: 'S256', access_type: 'offline', prompt: 'select_account' }); return { url: `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`, state }; }
  async callback(code: string | undefined, stateValue: string | undefined) {
    const clientId = this.required('GOOGLE_CLIENT_ID'); const clientSecret = this.required('GOOGLE_CLIENT_SECRET'); const callback = this.required('GOOGLE_CALLBACK_URL');
    if (!code || !stateValue) throw new BadRequestException('OAuth code and state are required.');
    const state = this.readState(stateValue);
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: callback, grant_type: 'authorization_code', code_verifier: state.verifier }) });
    if (!tokenResponse.ok) throw new UnauthorizedException('Google authorization failed.');
    const tokenData = await tokenResponse.json() as { access_token?: string };
    if (!tokenData.access_token) throw new UnauthorizedException('Google authorization did not return an access token.');
    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: `Bearer ${tokenData.access_token}` } });
    if (!profileResponse.ok) throw new UnauthorizedException('Google identity lookup failed.');
    const profile = await profileResponse.json() as GoogleProfile;
    if (!profile.sub || !profile.email || profile.email_verified !== true) throw new UnauthorizedException('Google account email is not verified.');
    const existingAccount = await this.prisma.account.findUnique({ where: { provider_providerAccountId: { provider: 'google', providerAccountId: profile.sub } }, include: { user: true } });
    if (existingAccount) return this.auth.startSession(existingAccount.user, state.rememberMe === true);
    const email = profile.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('This email already has a MissionLive account. Sign in locally before linking Google.');
    const user = await this.prisma.user.create({ data: { email, name: (profile.name ?? email.split('@')[0]).trim().slice(0, 80), avatarUrl: profile.picture, emailVerifiedAt: new Date(), accounts: { create: { provider: 'google', providerAccountId: profile.sub } } } });
    return this.auth.startSession(user, state.rememberMe === true);
  }
}
