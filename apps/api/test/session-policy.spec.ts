import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as argon2 from 'argon2';
import { AuthController } from '../src/auth/auth.controller';
import { LoginDto } from '../src/auth/auth.dto';
import { AuthService } from '../src/auth/auth.service';
import { DAY_IN_MILLISECONDS, PERSISTENT_SESSION_TTL_DAYS, sessionExpiration, sessionTtlDays } from '../src/auth/session-policy';

function config(values: Record<string, unknown> = {}) { return { get: jest.fn((name: string) => values[name]) } as unknown as ConfigService; }

describe('política de sessão', () => {
  it('preserva o TTL normal configurado e fixa a sessão persistente em 30 dias', () => {
    expect(sessionTtlDays(7, false)).toBe(7);
    expect(sessionTtlDays(7, true)).toBe(PERSISTENT_SESSION_TTL_DAYS);
    expect(sessionExpiration(1_000, 7, false).getTime()).toBe(1_000 + 7 * DAY_IN_MILLISECONDS);
    expect(sessionExpiration(1_000, 7, true).getTime()).toBe(1_000 + 30 * DAY_IN_MILLISECONDS);
  });

  it('cria a sessão com a expiração coerente e preserva a intenção persistente', async () => {
    const user = { id: 'user-1', email: 'ana@example.com', name: 'Ana', avatarUrl: null, avatarType: null, avatarPresetId: null, avatarFileKey: null, timezone: 'UTC', onboardingCompletedAt: null, preferencesJson: '{}' };
    const sessionCreate = jest.fn().mockResolvedValue({ id: 'session-1' });
    const prisma = { session: { create: sessionCreate } };
    const service = new AuthService(prisma as never, config({ SESSION_TTL_DAYS: 7 }));
    const before = Date.now(); const result = await service.startSession(user, true); const after = Date.now();
    expect(result.rememberMe).toBe(true);
    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 30 * DAY_IN_MILLISECONDS);
    expect(result.expiresAt.getTime()).toBeLessThanOrEqual(after + 30 * DAY_IN_MILLISECONDS);
    expect(sessionCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ expiresAt: result.expiresAt }) }));
  });

  it('autentica login normal e persistente com as políticas correspondentes', async () => {
    const passwordHash = await argon2.hash('senha-segura');
    const user = { id: 'user-1', email: 'ana@example.com', name: 'Ana', avatarUrl: null, avatarType: null, avatarPresetId: null, avatarFileKey: null, timezone: 'UTC', onboardingCompletedAt: null, preferencesJson: '{}', passwordHash, status: 'active', emailVerifiedAt: new Date() };
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user) }, session: { create: jest.fn().mockResolvedValue({ id: 'session-1' }) } };
    const service = new AuthService(prisma as never, config({ SESSION_TTL_DAYS: 7 }));
    const normal = await service.login({ email: user.email, password: 'senha-segura', rememberMe: false });
    const persistent = await service.login({ email: user.email, password: 'senha-segura', rememberMe: true });
    expect(normal.rememberMe).toBe(false); expect(persistent.rememberMe).toBe(true);
    expect(persistent.expiresAt.getTime() - normal.expiresAt.getTime()).toBeGreaterThan(22 * DAY_IN_MILLISECONDS);
  });

  it('exige booleano explícito no DTO de login', async () => {
    expect((await validate(plainToInstance(LoginDto, { email: 'ana@example.com', password: 'senha', rememberMe: true }))).length).toBe(0);
    expect((await validate(plainToInstance(LoginDto, { email: 'ana@example.com', password: 'senha', rememberMe: 'true' }))).length).toBeGreaterThan(0);
  });

  it('diferencia cookie de sessão e cookie persistente sem alterar as proteções', () => {
    const response = { cookie: jest.fn(), clearCookie: jest.fn() };
    const controller = new AuthController({} as never, config({ NODE_ENV: 'development' }), {} as never);
    const setCookie = (controller as unknown as { setCookie: (response: { cookie: jest.Mock }, token: string, expiresAt: Date, persistent: boolean) => void }).setCookie.bind(controller);
    const expiresAt = new Date(Date.now() + 30 * DAY_IN_MILLISECONDS);
    setCookie(response, 'opaque-token', expiresAt, false);
    expect(response.cookie).toHaveBeenLastCalledWith('missionlive_session', 'opaque-token', expect.objectContaining({ httpOnly: true, secure: false, sameSite: 'lax', path: '/' }));
    expect(response.cookie.mock.calls.at(-1)?.[2]).not.toHaveProperty('expires');
    expect(response.cookie.mock.calls.at(-1)?.[2]).not.toHaveProperty('maxAge');
    setCookie(response, 'opaque-token', expiresAt, true);
    expect(response.cookie).toHaveBeenLastCalledWith('missionlive_session', 'opaque-token', expect.objectContaining({ httpOnly: true, secure: false, sameSite: 'lax', path: '/', expires: expiresAt, maxAge: expect.any(Number) }));
  });

  it('revoga a sessão e remove o cookie no logout', async () => {
    const logout = jest.fn().mockResolvedValue(undefined); const response = { cookie: jest.fn(), clearCookie: jest.fn() };
    const controller = new AuthController({ logout } as never, config({ NODE_ENV: 'development' }), {} as never);
    await controller.logout({ sessionId: 'session-1' } as never, response as never);
    expect(logout).toHaveBeenCalledWith('session-1'); expect(response.clearCookie).toHaveBeenCalledWith('missionlive_session', expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }));
  });
});
