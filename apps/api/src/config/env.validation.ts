export function validateEnvironment(env: Record<string, unknown>) {
  const nodeEnv = String(env.NODE_ENV ?? 'development');
  const sessionSecret = String(env.SESSION_SECRET ?? '');
  if (nodeEnv !== 'test' && sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET must be configured with at least 32 characters.');
  }
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port.');
  return {
    ...env,
    NODE_ENV: nodeEnv,
    PORT: port,
    DATABASE_URL: String(env.DATABASE_URL ?? 'file:./data/missionlive.db'),
    WEB_ORIGIN: String(env.WEB_ORIGIN ?? 'http://localhost:5173'),
    SESSION_SECRET: sessionSecret,
  };
}
