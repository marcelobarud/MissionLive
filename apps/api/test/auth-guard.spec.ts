import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '../src/auth/auth.guard';

function context() {
  const request = { cookies: { missionlive_session: 'opaque-token' } } as Record<string, unknown>;
  return { request, execution: { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext };
}

function config() { return { get: jest.fn().mockReturnValue('missionlive_session') } as unknown as ConfigService; }

describe('AuthGuard', () => {
  it('aceita somente sessão ativa, não revogada e não expirada', async () => {
    const { request, execution } = context(); const prisma = { session: { findFirst: jest.fn().mockResolvedValue({ id: 'session-1', user: { id: 'user-1', email: 'ana@example.com', name: 'Ana', status: 'active', avatarUrl: null, avatarType: null, avatarPresetId: null, avatarFileKey: null, timezone: 'UTC', onboardingCompletedAt: null, preferencesJson: '{}' } }) } };
    const guard = new AuthGuard(prisma as never, config());
    await expect(guard.canActivate(execution)).resolves.toBe(true);
    expect(request).toEqual(expect.objectContaining({ sessionId: 'session-1', user: expect.objectContaining({ id: 'user-1' }) }));
    expect(prisma.session.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ revokedAt: null, expiresAt: { gt: expect.any(Date) } }) }));
  });

  it.each([
    { label: 'expirada', session: null },
    { label: 'revogada', session: null },
    { label: 'conta desabilitada', session: { id: 'session-1', user: { id: 'user-1', email: 'ana@example.com', name: 'Ana', status: 'disabled', avatarUrl: null, avatarType: null, avatarPresetId: null, avatarFileKey: null, timezone: 'UTC', onboardingCompletedAt: null, preferencesJson: '{}' } } },
  ])('rejeita sessão $label', async ({ session }) => {
    const { execution } = context(); const prisma = { session: { findFirst: jest.fn().mockResolvedValue(session) } }; const guard = new AuthGuard(prisma as never, config());
    await expect(guard.canActivate(execution)).rejects.toThrow('Session is invalid or expired.');
  });
});
