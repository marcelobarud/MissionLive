import { afterEach, describe, expect, it, vi } from 'vitest';

describe('API_URL', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
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

  it('serializes typed pagination and preserves the false hasDeadline filter', async () => {
    vi.stubEnv('VITE_API_URL', '');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ items: [], pagination: { page: 1, pageSize: 12, totalItems: 0, totalPages: 0 } }) });
    vi.stubGlobal('fetch', fetchMock);
    const { api } = await import('./api');

    await api.goals({ page: 2, pageSize: 12, hasDeadline: false, sort: 'recent' });

    expect(fetchMock).toHaveBeenCalledWith('/api/goals?page=2&pageSize=12&hasDeadline=false&sort=recent', expect.objectContaining({ credentials: 'include' }));
  });
});
