import { ConfigService } from '@nestjs/config';
import { GoogleOAuthService } from '../src/auth/google-oauth.service';

function config() { return { get: jest.fn((name: string) => ({ SESSION_SECRET: 's'.repeat(32), GOOGLE_CLIENT_ID: 'client-id', GOOGLE_CALLBACK_URL: 'http://localhost:3000/auth/google/callback' } as Record<string, string>)[name]) } as unknown as ConfigService; }

describe('Google OAuth e sessão persistente', () => {
  it('carrega rememberMe dentro do state assinado e mantém PKCE', () => {
    const service = new GoogleOAuthService(config(), {} as never, {} as never);
    const result = service.authorizationUrl(true); const query = new URL(result.url).searchParams;
    const payload = JSON.parse(Buffer.from(query.get('state')!.split('.')[0], 'base64url').toString()) as { rememberMe: boolean; verifier: string };
    expect(payload.rememberMe).toBe(true);
    expect(query.get('code_challenge_method')).toBe('S256');
    expect(query.get('code_challenge')).toBeTruthy();
  });

  it('não aceita alteração do rememberMe sem refazer a assinatura do state', () => {
    const service = new GoogleOAuthService(config(), {} as never, {} as never);
    const state = service.authorizationUrl(false).state; const [encoded, signature] = state.split('.');
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as { rememberMe: boolean };
    payload.rememberMe = true;
    const forged = `${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${signature}`;
    expect(() => (service as unknown as { readState: (value: string) => unknown }).readState(forged)).toThrow('Invalid OAuth state.');
  });
});
