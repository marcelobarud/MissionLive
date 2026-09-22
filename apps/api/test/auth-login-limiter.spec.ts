import { HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { AuthService } from '../src/auth/auth.service';
import {
  LOGIN_ATTEMPT_CLEANUP_INTERVAL_MILLISECONDS,
  LOGIN_ATTEMPT_LIMIT,
  LOGIN_ATTEMPT_WINDOW_MILLISECONDS,
  LoginAttemptLimiter,
} from '../src/auth/login-attempt-limiter';

jest.mock('argon2', () => ({ hash: jest.fn(), verify: jest.fn() }));

function config() { return { get: jest.fn(() => undefined) } as unknown as ConfigService; }

describe('LoginAttemptLimiter', () => {
  it('preserves the ten-attempt fixed window', () => {
    let now = 0;
    const limiter = new LoginAttemptLimiter(() => now);

    for (let index = 0; index < LOGIN_ATTEMPT_LIMIT; index += 1) {
      limiter.assertCanAttempt('ana@example.com');
      limiter.recordFailure('ana@example.com');
    }

    expect(limiter.size).toBe(1);
    expect(() => limiter.assertCanAttempt('ana@example.com')).toThrow(HttpException);
    now += LOGIN_ATTEMPT_WINDOW_MILLISECONDS - 1;
    expect(() => limiter.assertCanAttempt('ana@example.com')).toThrow(HttpException);
    now += 1;
    expect(() => limiter.assertCanAttempt('ana@example.com')).not.toThrow();
    expect(limiter.size).toBe(0);
  });

  it('removes many expired keys globally even when none of those keys return', () => {
    let now = 100;
    const limiter = new LoginAttemptLimiter(() => now, 100);
    for (let index = 0; index < 50; index += 1) {
      const email = `person-${index}@example.com`;
      limiter.assertCanAttempt(email);
      limiter.recordFailure(email);
    }
    expect(limiter.size).toBe(50);

    now += LOGIN_ATTEMPT_WINDOW_MILLISECONDS;
    limiter.assertCanAttempt('a-never-seen-email@example.com');
    expect(limiter.size).toBe(0);
  });

  it('bounds cardinality and rejects new keys while full, then admits them after expiry', () => {
    let now = 0;
    const limiter = new LoginAttemptLimiter(() => now, 2);
    limiter.recordFailure('first@example.com');
    limiter.recordFailure('second@example.com');

    expect(() => limiter.assertCanAttempt('third@example.com')).toThrow(HttpException);
    now += LOGIN_ATTEMPT_WINDOW_MILLISECONDS;
    expect(() => limiter.assertCanAttempt('third@example.com')).not.toThrow();
    expect(limiter.size).toBe(0);
  });

  it('starts only one unref-able cleanup interval and clears it on shutdown', () => {
    jest.useFakeTimers();
    let now = 0;
    const limiter = new LoginAttemptLimiter(() => now, 10, LOGIN_ATTEMPT_CLEANUP_INTERVAL_MILLISECONDS);
    try {
      limiter.startCleanup();
      limiter.startCleanup();
      expect(jest.getTimerCount()).toBe(1);
      limiter.recordFailure('stale@example.com');

      now += LOGIN_ATTEMPT_WINDOW_MILLISECONDS;
      jest.advanceTimersByTime(LOGIN_ATTEMPT_CLEANUP_INTERVAL_MILLISECONDS);
      expect(limiter.size).toBe(0);

      limiter.stopCleanup();
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      limiter.stopCleanup();
      jest.useRealTimers();
    }
  });

  it('does not let one email consume another email’s allowance', () => {
    const limiter = new LoginAttemptLimiter(() => 0);
    for (let index = 0; index < LOGIN_ATTEMPT_LIMIT; index += 1) limiter.recordFailure('ana@example.com');
    expect(() => limiter.assertCanAttempt('bruno@example.com')).not.toThrow();
    expect(() => limiter.assertCanAttempt('ana@example.com')).toThrow(HttpException);
  });
});

describe('AuthService login limiter integration', () => {
  afterEach(() => jest.restoreAllMocks());

  it('normalizes email, counts invalid credentials, clears on successful login, and preserves 429', async () => {
    let passwordIsValid = false;
    const user = {
      id: 'user-a', email: 'ana@example.com', name: 'Ana', passwordHash: 'hash', status: 'active',
      emailVerifiedAt: new Date(), avatarUrl: null, avatarType: null, avatarPresetId: null,
      avatarFileKey: null, timezone: 'UTC', onboardingCompletedAt: null, preferencesJson: '{}',
    };
    const findUnique = jest.fn(async ({ where }: { where: { email: string } }) => where.email === user.email ? user : null);
    const prisma = {
      user: { findUnique },
      session: { create: jest.fn().mockResolvedValue({ id: 'session-a' }) },
    };
    jest.mocked(argon2.verify).mockImplementation(async () => passwordIsValid);
    const service = new AuthService(prisma as never, config());

    for (let index = 0; index < LOGIN_ATTEMPT_LIMIT - 1; index += 1) {
      const email = index % 2 === 0 ? 'ANA@example.com' : 'ana@example.com';
      await expect(service.login({ email, password: 'incorrect' })).rejects.toBeInstanceOf(UnauthorizedException);
    }

    passwordIsValid = true;
    await expect(service.login({ email: 'Ana@Example.com', password: 'correct' })).resolves.toMatchObject({ user: { id: user.id } });
    passwordIsValid = false;

    for (let index = 0; index < LOGIN_ATTEMPT_LIMIT; index += 1) {
      await expect(service.login({ email: user.email, password: 'incorrect' })).rejects.toBeInstanceOf(UnauthorizedException);
    }
    const blocked = await service.login({ email: user.email, password: 'incorrect' }).catch((error: unknown) => error);
    expect(blocked).toBeInstanceOf(HttpException);
    expect((blocked as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(findUnique).toHaveBeenCalledTimes(20);

    await expect(service.login({ email: 'bruno@example.com', password: 'incorrect' })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(findUnique).toHaveBeenCalledTimes(21);
  });
});
