import { afterEach, describe, expect, it, vi } from 'vitest';

describe('API_URL', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('uses the same-origin proxy by default', async () => {
    vi.stubEnv('VITE_API_URL', '');
    const { API_URL } = await import('./api');
    expect(API_URL).toBe('/api');
  });

  it('preserves an explicit API URL for deployed environments', async () => {
    vi.stubEnv('VITE_API_URL', 'http://192.0.2.20:3000');
    const { API_URL } = await import('./api');
    expect(API_URL).toBe('http://192.0.2.20:3000');
  });
});
