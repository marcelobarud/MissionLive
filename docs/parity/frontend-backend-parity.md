# Paridade Frontend × Backend — F19

> Auditoria histórica, não backlog ativo. A tabela registra a fotografia do projeto em 2026-09-01, antes dos ciclos 02/03 e da migração consolidada. Para o estado atual, use `AI_CONTEXT.md`, `docs/phase-status.md` e o código.

Data da auditoria: 2026-09-01  
Base: `main` em `645b5f3` e estado do working tree antes das Fases 20–21.

## 1. Controllers e endpoints

| Área | Método e rota | Backend | Superfície web na auditoria | Gap/próximo passo |
|---|---|---:|---:|---|
| Health | `GET /health` | pronto | nenhuma | operacional |
| Auth | `POST /auth/register` | pronto | `/` cadastro | recuperação e mensagens completas |
| Auth | `POST /auth/login` | pronto | `/` login | sessão expirada |
| Auth | `POST /auth/logout` | pronto | botão sair | pronto |
| Auth | `GET /auth/me` | pronto | bootstrap da aplicação | pronto |
| Auth | `POST /auth/verify-email` | pronto | token local na tela | rota/estado dedicado |
| Auth | `POST /auth/forgot-password` | pronto | ausente | F21 |
| Auth | `POST /auth/reset-password` | pronto | ausente | F21 |
| Auth | `GET /auth/google` e callback | configurável | link | credenciais reais continuam externas |
| Categories | `GET /categories` | pronto | ausente | F20 |
| Goals | `GET/POST/PATCH/DELETE /goals` | pronto | lista/criação; edição/cancelamento ausentes | F20 |
| Goals | `GET /goals/:goalId` | pronto | detalhe | ampliar contexto e progresso coletivo |
| Goals | `POST /goals/:goalId/override` | pronto | botão no detalhe | resumo/celebração |
| Steps | CRUD/reorder em `/goals/:goalId/steps` | pronto | adicionar e marcar | editar/remover/reordenar |
| Progress | `PUT .../progress` | pronto | checkbox próprio | resumo individual/coletivo |
| Goal members | `PATCH/DELETE .../members/:memberId` | pronto | ausente | F20/F21 |
| Teams | `GET/POST/PATCH/DELETE /teams` | pronto | lista/criação básica | F21 |
| Team members | `PATCH/DELETE /teams/:teamId/members/:memberId` | pronto | ausente | F21 |
| Invites | `POST /invites` | pronto | convite de meta | equipe e revogação |
| Invites | `GET /invites/:token` | pronto | preview | pronto |
| Invites | `POST /invites/accept` | pronto | aceite | recusa/retomada UX |
| Invites | `POST /invites/:inviteId/revoke` | pronto | ausente | F21 |
| Dashboard | `GET /dashboard` | pronto | cards e barra | F23 |
| Plans | `GET /plans/current` | pronto | ausente | informação de conta |

## 2. Rotas e capacidades do frontend

| Rota | Estado atual | Capacidades existentes |
|---|---|---|
| `/` | parcial | login/cadastro ou dashboard autenticado |
| `/goals` | parcial | listagem escopada, cards e estado vazio |
| `/goals/new` | parcial | nome, descrição, data inicial e tags |
| `/goals/:goalId` | parcial | detalhe básico, steps, progresso, override e convite |
| `/teams` | parcial | listagem e criação básica |
| `/invite/:token` | parcial | preview e aceite autenticado |

Não existiam na auditoria: detalhe de equipe, edição de meta/equipe, gestão de membros, recuperação de senha, perfil/preferências, busca/filtros, reminders, activity, comentários/reações, templates, calendário, onboarding e notificações.

## 3. Campos suportados

| Domínio | API/backend | Formulário web na auditoria |
|---|---|---|
| Goal | name, description, categoryId, customCategory, tags, startDate, endDate, teamId | name, description, tags, startDate |
| Step | title, description, position | title |
| Team | name, description | name |
| Invite | targetType, targetId; role definido no servidor | meta apenas |
| User | name, email, avatarUrl, provider, timezone ainda ausente | name/email/password |

## 4. Permissões observadas

- Owner de goal: administra estrutura, membros, cancelamento e owner override.
- `admin` de goal/team: recebe administração conforme a policy do backend.
- `editor`: edita conteúdo permitido, sem administração de membros.
- `viewer`: visualiza e altera somente o próprio progresso.
- Goal de equipe: acesso herdado pela membership da equipe; não aceita compartilhamento direto.
- Frontend não é fonte de autorização; todos os endpoints sensíveis passam pelo `AuthGuard` e pelas policies dos services.

## 5. Testes e evidências da auditoria

Existiam testes de ambiente, bootstrap, isolamento de detalhe, bloqueio de viewer e exclusividade do owner override. O smoke test manual já havia validado cadastro/verificação/login, criação de goal/step, isolamento entre Usuário A/B, conclusão automática e owner override.

## 6. Backlog objetivo derivado

### F20 — Paridade de metas

1. Criar componentes/formulários reutilizáveis para todos os campos de goal.
2. Expor categoria, categoria personalizada, data final, equipe e steps completos.
3. Exibir owner, contexto, membros, progresso individual/coletivo, tags e auditoria de override.
4. Expor editar, cancelar, arquivar quando o domínio suportar, gestão de steps, convite e revogação.
5. Adicionar testes de integração browser → API → SQLite e testes negativos por role.

### F21 — Paridade de equipes, convites e conta

1. Criar detalhe de equipe com owner, membros, roles, goals e progresso.
2. Implementar criação coerente de equipe + primeira meta + steps.
3. Expor convites de equipe, revogação, recusa e compartilhamento/fallbacks.
4. Implementar recuperação/redefinição de senha, verificação e sessão expirada na UI.

### Limitações externas preservadas

- PostgreSQL continua não validado sem credencial SCRAM.
- Google OAuth continua configurável, sem credenciais reais.
- Nenhuma limitação externa impede a implementação de F20/F21.
