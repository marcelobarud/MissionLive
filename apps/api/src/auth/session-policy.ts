export const DEFAULT_SESSION_TTL_DAYS = 30;
export const PERSISTENT_SESSION_TTL_DAYS = 30;
export const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
export const PERSISTENT_SESSION_TTL_MILLISECONDS = PERSISTENT_SESSION_TTL_DAYS * DAY_IN_MILLISECONDS;

export function sessionTtlDays(configuredTtl: unknown, rememberMe: boolean) {
  if (rememberMe) return PERSISTENT_SESSION_TTL_DAYS;
  const ttl = Number(configuredTtl ?? DEFAULT_SESSION_TTL_DAYS);
  return Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_SESSION_TTL_DAYS;
}

export function sessionExpiration(now: number, configuredTtl: unknown, rememberMe: boolean) {
  const ttl = rememberMe ? PERSISTENT_SESSION_TTL_MILLISECONDS : sessionTtlDays(configuredTtl, false) * DAY_IN_MILLISECONDS;
  return new Date(now + ttl);
}
