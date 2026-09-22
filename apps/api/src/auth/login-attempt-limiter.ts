import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { HttpException, HttpStatus } from '@nestjs/common';

export const LOGIN_ATTEMPT_LIMIT = 10;
export const LOGIN_ATTEMPT_WINDOW_MILLISECONDS = 15 * 60 * 1000;
export const MAX_TRACKED_LOGIN_KEYS = 10_000;
export const LOGIN_ATTEMPT_CLEANUP_INTERVAL_MILLISECONDS = 60 * 1000;

type LoginAttempt = { count: number; resetAt: number };

export class LoginAttemptLimiter {
  private readonly attempts = new Map<string, LoginAttempt>();
  private cleanupTimer: ReturnType<typeof setInterval> | undefined;

  constructor(
    private readonly clock: () => number = () => performance.now(),
    private readonly maxEntries = MAX_TRACKED_LOGIN_KEYS,
    private readonly cleanupIntervalMilliseconds = LOGIN_ATTEMPT_CLEANUP_INTERVAL_MILLISECONDS,
  ) {}

  get size() { return this.attempts.size; }

  startCleanup() {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => this.removeExpired(this.clock()), this.cleanupIntervalMilliseconds);
    this.cleanupTimer.unref?.();
  }

  stopCleanup() {
    if (!this.cleanupTimer) return;
    clearInterval(this.cleanupTimer);
    this.cleanupTimer = undefined;
  }

  assertCanAttempt(normalizedEmail: string) {
    const now = this.clock();
    this.removeExpired(now);
    const attempt = this.attempts.get(this.key(normalizedEmail));
    if (attempt && attempt.count >= LOGIN_ATTEMPT_LIMIT) this.reject();
    if (!attempt && this.attempts.size >= this.maxEntries) this.reject();
  }

  recordFailure(normalizedEmail: string) {
    const now = this.clock();
    this.removeExpired(now);
    const key = this.key(normalizedEmail);
    const current = this.attempts.get(key);
    if (current) {
      this.attempts.set(key, { count: current.count + 1, resetAt: current.resetAt });
      return;
    }
    if (this.attempts.size >= this.maxEntries) this.reject();
    this.attempts.set(key, { count: 1, resetAt: now + LOGIN_ATTEMPT_WINDOW_MILLISECONDS });
  }

  clear(normalizedEmail: string) { this.attempts.delete(this.key(normalizedEmail)); }

  private removeExpired(now: number) {
    // Monotonic time plus fixed windows keep entries ordered by reset time.
    for (const [key, attempt] of this.attempts) {
      if (attempt.resetAt > now) break;
      this.attempts.delete(key);
    }
  }

  private key(normalizedEmail: string) { return createHash('sha256').update(normalizedEmail).digest('base64url'); }

  private reject(): never {
    throw new HttpException('Too many login attempts. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
  }
}
