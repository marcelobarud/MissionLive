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

Consulte `AI_CONTEXT.md`, `IMPLEMENTATION_PLAN.md` e `GOAL.md` para as decisões completas da V1. O ciclo complementar está registrado em `GOAL_02.md`, `IMPLEMENTATION_PLAN_02.md` e `docs/PLANO_02_FECHAMENTO.md`.
