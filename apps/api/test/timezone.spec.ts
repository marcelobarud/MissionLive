import { BadRequestException } from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service';
import { isValidIanaTimezone } from '../src/auth/timezone';

function fakePrisma() {
  const user = { id: 'user-1', email: 'ana@example.com', name: 'Ana', avatarUrl: null, avatarType: null, avatarPresetId: null, avatarFileKey: null, timezone: 'America/Sao_Paulo', onboardingCompletedAt: null, preferencesJson: '{}' };
  return { user: { findUnique: jest.fn().mockResolvedValue(user), update: jest.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...user, ...data })) } };
}

describe('timezone validation', () => {
  it('accepts valid IANA identifiers and rejects invalid values', () => {
    expect(isValidIanaTimezone('America/Sao_Paulo')).toBe(true);
    expect(isValidIanaTimezone('Asia/Tokyo')).toBe(true);
    expect(isValidIanaTimezone('not/a-timezone')).toBe(false);
    expect(isValidIanaTimezone('UTC-3')).toBe(false);
  });

  it('rejects invalid timezone values before updating the profile', async () => {
    const prisma = fakePrisma(); const service = new AuthService(prisma as never, {} as never);
    await expect(service.updateProfile('user-1', { timezone: 'not/a-timezone' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('persists the selected IANA timezone', async () => {
    const prisma = fakePrisma(); const service = new AuthService(prisma as never, {} as never);
    await service.updateProfile('user-1', { timezone: 'America/New_York' });
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ timezone: 'America/New_York' }) }));
  });
});
