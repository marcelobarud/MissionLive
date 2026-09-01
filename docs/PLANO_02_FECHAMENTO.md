# Fechamento do Plano 02

Data: 2026-09-01

## Resultado

O ciclo F19–F35 do `GOAL_02.md` foi executado sobre React/Vite, NestJS e Prisma. A aplicação web agora cobre os fluxos de metas, equipes, colaboração, lembretes, atividade, comentários/reações, modelos, calendário, ritmo, onboarding, perfil e notificações internas.

## Fases e commits

| Fases | Entrega | Commit |
|---|---|---|
| 19 | auditoria de paridade e backlog | `c2017f6` |
| 20–21 | metas, equipes, convites e conta | `0e1d3ca` |
| 22–24 | progressão, dashboard, busca e filtros | `f08d2dc` |
| 25–27 | reminders, activity, comentários e reações | `d45bc3f` |
| 28–30 | templates, calendário e ritmo | `db3aa43` |
| 31–33 | onboarding, perfil e notificações | `2d8e2f3` |
| 34–35 | hardening, testes e fechamento | este commit |

## Persistência

Migrations aplicadas no SQLite local:

- `20260831220000_init`
- `20260831223000_goal_audit_events`
- `20260901120000_reminders`
- `20260901130000_activity_events`
- `20260901140000_comments_reactions`
- `20260901150000_templates`
- `20260901160000_onboarding_profile_notifications`

## Superfície entregue

Backend: metas e steps escopados, progresso próprio, conclusão/override, equipes e roles, convites hashados, dashboard, reminders com timezone, activity escopada, comentários e reações limitados, templates, calendário, ritmo, perfil, sessões e notificações.

Frontend: dashboard V2, filtros server-side, detalhe rico de meta, colaboração, lembretes, conversa, atividade, modelos, timeline, indicador de ritmo, onboarding, perfil e avisos.

## Verificações

Executados com sucesso:

- `npm run db:migrate`
- `npm run test` — 4 suítes backend/1 frontend, 8 testes no total
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm audit --omit=dev --audit-level=high` — 0 vulnerabilidades
- `git diff --check`

## Segurança

O backend continua sendo a autoridade de acesso. Listagens usam escopo por owner/membership/team; operações sensíveis revalidam role; comentários são texto simples sem HTML; reactions têm conjunto fechado, constraint única e rate limit; tokens de convite/reset não são persistidos em claro; notificações não concedem acesso e seus links passam pelas rotas protegidas.

Foi incluído teste negativo para garantir que o feed de atividade constrói consulta escopada. A auditoria final mantém as cinco categorias: isolamento, autorização somente no backend, IDOR, segredos e XSS/input.

## Dependências externas ainda pendentes

- PostgreSQL real continua bloqueado por ausência de URL/credencial SCRAM neste ambiente; SQLite é o banco validado para desenvolvimento.
- Google OAuth está preparado/configurável, mas o fluxo real depende de client ID/secret e callback fornecidos pelo ambiente.
- Entrega de e-mail/push não foi adicionada; notificações são internas e o reminders foi preparado para evolução futura.

## Diferenças conhecidas e backlog

- O gerenciamento avançado de membros de meta e listagem persistida de convites ainda é mais completo na API que na web.
- Recuperação de senha exibe token somente no desenvolvimento.
- Rate limits em memória exigem store compartilhado antes de escalar horizontalmente.
- Fora do escopo: gamificação, billing, Capacitor/push nativo, chat realtime, feed público, hábitos como domínio separado, Kanban, metas recorrentes, subtarefas hierárquicas e geração automática por IA.
