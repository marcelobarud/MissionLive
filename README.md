# MissionLive

MissionLive é uma V1 mobile-first para metas individuais, compartilhadas e de equipes.

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

Consulte `AI_CONTEXT.md`, `IMPLEMENTATION_PLAN.md` e `GOAL.md` para o escopo e as decisões da V1. Integração Google e cobrança ficam configuráveis, sem credenciais ou provider fictícios.
