import { validateEnvironment } from '../src/config/env.validation';

describe('validateEnvironment', () => {
  it('rejects an absent production secret', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'development' })).toThrow('SESSION_SECRET');
  });

  it('accepts test configuration without a secret', () => {
    expect(validateEnvironment({ NODE_ENV: 'test' }).DATABASE_URL).toBe('file:./data/missionlive.db');
  });
});
