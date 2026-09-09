import { validateEnvironment } from '../src/config/env.validation';

describe('validateEnvironment', () => {
  it('rejects an absent production secret', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'development' })).toThrow('SESSION_SECRET');
  });

  it('accepts test configuration without a secret', () => {
    const config = validateEnvironment({ NODE_ENV: 'test' });
    expect(config.DATABASE_URL).toBe('file:./data/missionlive.db');
    expect(config.API_HOST).toBe('127.0.0.1');
    expect(config.CORS_ORIGINS).toBe('http://localhost:5173');
  });

  it('keeps the canonical invite origin separate from allowed CORS origins', () => {
    const config = validateEnvironment({ NODE_ENV: 'test', WEB_ORIGIN: 'https://missionlive.example', CORS_ORIGINS: 'http://localhost:5173, http://192.0.2.20:5173' });
    expect(config.WEB_ORIGIN).toBe('https://missionlive.example');
    expect(config.CORS_ORIGINS).toBe('http://localhost:5173,http://192.0.2.20:5173');
  });

  it('rejects a list in WEB_ORIGIN and malformed CORS origins', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'test', WEB_ORIGIN: 'http://localhost:5173,http://192.0.2.20:5173' })).toThrow('WEB_ORIGIN');
    expect(() => validateEnvironment({ NODE_ENV: 'test', CORS_ORIGINS: 'not-a-url' })).toThrow('CORS_ORIGINS');
  });

  it('exige as três configurações VAPID juntas', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'test', VAPID_PUBLIC_KEY: 'public' })).toThrow('VAPID_PUBLIC_KEY');
    expect(() => validateEnvironment({ NODE_ENV: 'test', VAPID_PUBLIC_KEY: 'public', VAPID_PRIVATE_KEY: 'private', VAPID_SUBJECT: 'invalid' })).toThrow('VAPID_SUBJECT');
  });

  it('exige VAPID em produção', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'production', SESSION_SECRET: 'a'.repeat(32) })).toThrow('VAPID');
  });
});
