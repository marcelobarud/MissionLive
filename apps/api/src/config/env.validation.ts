function httpOrigin(value: unknown, name: string) {
  const raw = String(value ?? '').trim();
  if (!raw || raw.includes(',')) throw new Error(`${name} must be a single HTTP(S) origin.`);
  let parsed: URL;
  try { parsed = new URL(raw); } catch { throw new Error(`${name} must be a valid HTTP(S) origin.`); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.pathname !== '/' || parsed.search || parsed.hash) throw new Error(`${name} must be a valid HTTP(S) origin.`);
  return parsed.origin;
}

export function parseCorsOrigins(value: unknown, fallback: string) {
  const entries = String(value ?? fallback).split(',').map((entry) => entry.trim()).filter(Boolean);
  if (!entries.length) throw new Error('CORS_ORIGINS must contain at least one HTTP(S) origin.');
  return [...new Set(entries.map((entry) => httpOrigin(entry, 'CORS_ORIGINS')))];
}

export function validateEnvironment(env: Record<string, unknown>) {
  const nodeEnv = String(env.NODE_ENV ?? 'development');
  const sessionSecret = String(env.SESSION_SECRET ?? '');
  if (nodeEnv !== 'test' && sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET must be configured with at least 32 characters.');
  }
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port.');
  const webOrigin = httpOrigin(env.WEB_ORIGIN ?? 'http://localhost:5173', 'WEB_ORIGIN');
  const apiHost = String(env.API_HOST ?? '127.0.0.1').trim();
  if (!apiHost || /[\s/:]/.test(apiHost)) throw new Error('API_HOST must be a host name or IP address without a protocol or port.');
  const corsOrigins = parseCorsOrigins(env.CORS_ORIGINS, webOrigin);
  const vapidPublicKey = String(env.VAPID_PUBLIC_KEY ?? '').trim();
  const vapidPrivateKey = String(env.VAPID_PRIVATE_KEY ?? '').trim();
  const vapidSubject = String(env.VAPID_SUBJECT ?? '').trim();
  const vapidConfigured = [vapidPublicKey, vapidPrivateKey, vapidSubject].filter(Boolean).length;
  if (vapidConfigured > 0 && vapidConfigured < 3) throw new Error('VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT must be configured together.');
  if (nodeEnv === 'production' && vapidConfigured !== 3) throw new Error('VAPID credentials must be configured in production.');
  if (vapidSubject && !/^(mailto:[^\s@]+@[^\s@]+|https?:\/\/[^\s]+)$/.test(vapidSubject)) throw new Error('VAPID_SUBJECT must be a mailto or HTTP(S) URL.');
  return {
    ...env,
    NODE_ENV: nodeEnv,
    PORT: port,
    DATABASE_URL: String(env.DATABASE_URL ?? 'file:./data/missionlive.db'),
    API_HOST: apiHost,
    WEB_ORIGIN: webOrigin,
    CORS_ORIGINS: corsOrigins.join(','),
    SESSION_SECRET: sessionSecret,
    VAPID_PUBLIC_KEY: vapidPublicKey,
    VAPID_PRIVATE_KEY: vapidPrivateKey,
    VAPID_SUBJECT: vapidSubject,
  };
}
