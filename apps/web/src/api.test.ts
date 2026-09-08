import { afterEach, describe, expect, it, vi } from 'vitest';

describe('API_URL', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('uses localhost by default', async () => {
    vi.stubEnv('VITE_API_URL', '');
    const { API_URL } = await import('./api');
    expect(API_URL).toBe('http://localhost:3000');
  });

  it('uses the explicit API URL for opt-in LAN access', async () => {
    vi.stubEnv('VITE_API_URL', 'http://192.0.2.20:3000');
    const { API_URL } = await import('./api');
    expect(API_URL).toBe('http://192.0.2.20:3000');
  });
});
