# MissionLive

MissionLive é uma V1 mobile-first para metas individuais, compartilhadas e de equipes.

## Arquitetura

- `apps/web`: React + TypeScript + Vite, navegação responsiva e API client com cookies de sessão.
- `apps/api`: NestJS + TypeScript, REST, guards/policies de autorização e Prisma.
- Banco local: SQLite com migrations versionadas em `apps/api/prisma/migrations`.
- Produção: PostgreSQL deve ser validado com `scripts/validate-postgres.ps1` antes do deploy.

O backend é a autoridade para autenticação, escopo, roles, limite de três convidados, convites, progresso e conclusão. O frontend apenas reflete o estado permitido.

## Desenvolvimento

Requisitos: Node.js 20+ e npm 10+.

```powershell
Copy-Item .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

O frontend fica em `http://localhost:5173` e a API em `http://localhost:3000`.

Para configurar o primeiro superadministrador, use o bootstrap explícito por e-mail após o cadastro da conta:

```powershell
npm run admin:bootstrap --workspace @missionlive/api -- --email usuario@dominio.com
```

O comando é idempotente e não é executado automaticamente pela API.

O acesso pela rede local é deliberadamente opt-in. Para testar em outro dispositivo, use no `.env`:

```dotenv
API_HOST=0.0.0.0
VITE_DEV_HOST=0.0.0.0
VITE_API_URL=http://<IP_LOCAL>:3000
CORS_ORIGINS=http://localhost:5173,http://<IP_LOCAL>:5173
```

Mantenha `WEB_ORIGIN` como a URL canônica única usada nos convites. Regras de firewall são configuração da máquina e não fazem parte do repositório.

Para habilitar Google OAuth, configure os placeholders correspondentes no `.env`; consulte `docs/auth/google-oauth.md`. Nenhuma credencial é necessária para o fluxo local: em desenvolvimento o token de verificação aparece na resposta de cadastro.

## Validação

```powershell
npm run build
npm run typecheck
npm run lint
npm run test
npm audit --omit=dev --audit-level=high
```

Consulte `docs/security-audit/relatorio-auditoria-seguranca.pdf` para a auditoria final. O relatório não confirmou achados reais nas cinco categorias avaliadas; limitações e recomendações estão documentadas no PDF.

## Limitações conhecidas

- Google OAuth precisa de client ID/secret e callback configurados.
- O rate limiting de login é por processo; use store compartilhado antes de escalar horizontalmente.
- A validação PostgreSQL requer uma URL/credencial SCRAM fornecida no ambiente.

## Backlog V2

Capacitor para Android/iOS, gamificação, XP/achievements/streaks, billing provider, push notifications, objetivos avançados, real-time e anexos/evidências.

Para decisões vigentes, consulte `AI_CONTEXT.md`, `AGENTS.md`, `DESIGN.md` e `docs/phase-status.md`. `IMPLEMENTATION_PLAN*.md`, `GOAL*.md` e os fechamentos de plano são registros históricos dos ciclos concluídos. A migração consolidada do experimento está registrada em `docs/migration/2026-09-08-experimental-to-official.md`.
