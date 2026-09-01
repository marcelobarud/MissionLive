# Google OAuth

O MissionLive possui um adaptador OAuth baseado em Authorization Code + state assinado e PKCE (S256), com validação de e-mail verificado e identidade Google (`sub`). O client secret nunca é enviado ao frontend.

Para habilitar o redirect local, configure no `.env` da API:

```text
GOOGLE_CLIENT_ID=<client-id>
GOOGLE_CLIENT_SECRET=<client-secret>
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

Sem essas credenciais, `GET /auth/google` responde `503` de forma explícita. A integração real não foi executada neste ambiente porque nenhuma credencial foi fornecida. Se o e-mail já possuir conta local, o callback recusa a criação de uma identidade duplicada; o vínculo deve ser iniciado por um fluxo autenticado futuro.
