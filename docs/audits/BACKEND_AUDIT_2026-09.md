# Auditoria do backend MissionLive — setembro de 2026

## Escopo e método

- Data: 22/09/2026; branch backend-audit-cleanup.
- Base: main em a98dfaf77fd037cef2c4b3acdf31575e5c33536b; branch criada nesse mesmo commit.
- Escopo: API, DTOs/controllers, consumidores web, Prisma/migrations/seeds, testes, dependências e documentação operacional/de segurança relacionada.
- Método: leitura estática, cruzamento de referências e baseline. Nenhuma limpeza ou alteração funcional foi feita.
- apps/api/var/goal-photos foi apenas confirmado como existente/ignorado pelo Git; nenhuma foto foi lida, movida ou removida.

## A. Sumário executivo

Backend ativo: 18 áreas de módulo mais health, **87 handlers HTTP**, **27 models Prisma**, **16 migrations** e **145 testes em 23 suítes**. Há controles úteis de autenticação e escopo por usuário/membership, validação global de DTOs, transações em operações relevantes e testes direcionados.

Não foi confirmado P0. Classificação: **2 P1, 3 P2 e 9 P3**. P1: a cadeia Express/Multer reportada com vulnerabilidades altas em multer@2.2.0, alcançável nos endpoints multipart autenticados; e o limitador público de login, cujo Map aceita e-mails arbitrários e não remove chaves expiradas globalmente. Nada foi corrigido nesta fase.

Não há evidência para declarar módulos inteiros mortos. GoogleCallbackDto não tem referências localizadas; jose e zod são dependências diretas sem referências encontradas no backend. São candidatos a confirmação, não remoções aprovadas. Plan/Subscription são infraestrutura parcial/future-ready, não código descartável por ausência de consumidor frontend.

| Severidade | Total | Leitura |
|---|---:|---|
| P0 | 0 | Nenhum risco crítico imediato confirmado. |
| P1 | 2 | Corrigir/mitigar antes de produção. |
| P2 | 3 | Validar/corrigir antes de maior escala ou PostgreSQL. |
| P3 | 9 | Simplificação, cobertura ou decisão futura. |

### Baseline

| Verificação | Resultado |
|---|---|
| API typecheck / lint / build | PASSOU |
| API testes | PASSOU: 23 suítes, 145 testes |
| Prisma validate | PASSOU; schema válido |
| Prisma migrate status | PASSOU; SQLite atualizado, 16 migrations aplicadas, nenhuma pendente |
| Frontend 127.0.0.1:5173/ | HTTP 200 |
| API 127.0.0.1:3000/health | HTTP 200, status ok / missionlive-api |
| Proxy 127.0.0.1:5173/api/health | HTTP 200, mesmo payload |

npm audit --workspace=@missionlive/api --omit=dev --json (22/09/2026) reportou 0 critical, 3 high, 0 moderate e 0 low no grafo runtime. Os nós high são @nestjs/core, @nestjs/platform-express e multer; core é afetado via platform-express. Multer tem quatro advisory records (três high e um low). Fix automático sugerido: Nest 12.0.4, major ante Nest 11 instalado; não aplicado.

## B. Inventário de módulos e contratos

As contagens são decorators HTTP em controllers. Rotas de mídia e consumidores internos também foram contados.

| Área | Status | Controller/serviço e superfície | Dados, consumidor, testes | Ação |
|---|---|---|---|---|
| Auth — 13 | ACTIVE | Registro, login/logout, perfil/sessões/onboarding, verificação/reset, OAuth; AuthService, GoogleOAuthService, AuthGuard e DTOs. | User, Account, Session, AuthToken; web api.ts e redirect OAuth em app.tsx; auth-guard, session-policy, profile, google-oauth. | Preservar; corrigir limitador P1. |
| Admin — 9 | ACTIVE | admin/overview (1), admin/users (3), admin/administrators (5); serviços de consulta, bootstrap/auditoria e DTOs. | User, AdminAuditLog; UI admin e CLI admin:bootstrap; testes admin-overview/users/administrators, platform-admin. | Preservar; bootstrap é consumidor operacional. |
| Avatars — 4 | ACTIVE | Preset, upload, remoção, mídia; AvatarsService/AvatarStorage, DTO e FileInterceptor. | Campos de avatar em User; web/serializer; avatars.spec; sharp. | Preservar; observar rate limit local/cleanup. |
| Goals — 20 | ACTIVE | CRUD/estado/override, fotos/mídia, rhythm, steps/reorder/progress, membros; GoalsService (488 linhas), goals.dto.ts. | Goal, membros, steps/progress, ocorrências, fotos/auditoria; web e dashboard/calendar/templates/reminders/activity; testes auth/fotos/metas diárias. | Preservar regras; decomposição P3. |
| Categories — 1 | ACTIVE | GET /categories; CategoriesController, sem service separado. | Category; fluxo de metas; dado não privado. | Preservar. |
| Teams — 11 | ACTIVE | Lista/CRUD, criação com meta, imagem, membros/papéis; TeamsService e DTOs. | Team, TeamMember e metas de equipe; web/API; team-images.spec. | Preservar; adicionar cobertura de CRUD/membros. |
| Invites — 4 | ACTIVE | Preview público e criação/aceite/revogação autenticados; InvitesService e DTOs. | InviteLink, InviteRedemption, GoalMember/TeamMember; web/API; sem invites.spec. | Preservar; testar concorrência (P2). |
| Dashboard — 1 | ACTIVE | GET /dashboard; DashboardService agrega GoalsService.list. | Goal e relações/progresso; página inicial web; sem teste dedicado. | Preservar; reduzir leitura integral conforme crescimento. |
| Plans — 1 | PARTIAL / FUTURE-READY | GET /plans/current; PlansService.current e hasEntitlement. | Plan, Subscription, seed development; sem chamada frontend nem consumidor hasEntitlement; sem teste dedicado. | Não remover; requer decisão de produto. |
| Reminders — 4 + scheduler | ACTIVE | CRUD/cancelamento; RemindersService executa processDue a cada minuto. | Reminder, Notification, Push; web/API e service worker; testes reminders/targets/delivery/daily. | Preservar; claim, notificação e atualização na mesma transação. |
| Activity — 1 | ACTIVE | GET /activity; ActivityService lista por escopo e registra eventos/notificações internamente. | ActivityEvent, Goal/Team/Users; web/API; activity-authorization.spec. | Preservar; paginar offset conforme escala. |
| Comments — 5 | ACTIVE | Listar/criar/editar/remover e alternar reação; CommentsService e DTOs. | Comment, Reaction; web/API; sem suíte dedicada. | Preservar; incluir testes de autorização/rate limit. |
| Templates — 4 | ACTIVE | Listar, criar de meta, usar e remover; TemplatesService e DTOs. | GoalTemplate, Category, Goal/steps; web/API; sem suíte dedicada. | Preservar; testar atomicidade de criação. |
| Calendar — 1 | ACTIVE | GET /calendar; CalendarService consulta metas e lembretes por intervalo. | Goal, Reminder; web/API; calendar.spec. | Preservar; limitar janela/paginar conforme volume (P2). |
| Notifications — 4 | ACTIVE | Listar, contador, marcar lida/todas; NotificationsService. | Notification; web/API e reminders; sem suíte dedicada. | Preservar; adicionar teste de isolamento. |
| Push — 3 | ACTIVE | Chave pública, registrar/remover inscrição; PushService. | PushSubscription; web/API e service worker; push.spec. | Preservar; VAPID documentado. |
| Prisma — 0 | ACTIVE | PrismaService, schema, seed, scripts e migrations. | 27 models, 16 migrations. | Preservar SQLite atual; não editar migrations aplicadas. |
| Config/Common — 0 | ACTIVE / REVIEW | Configuração/validação de ambiente, filtro de erros, timezone/utilitários. | Uso transversal; env-validation e timezone tests. | Manter; decidir semântica de timezone antes de unificar. |
| Health — 1 | ACTIVE | GET /health, público e sem dados de usuário. | Operação/health check; health.spec. | Preservar. |

### Superfície HTTP agrupada

Os 87 handlers distribuem-se em: /auth/* 13; /admin/* 9; perfil/avatar e /media/avatars/* 4; /goals/* 20; /categories 1; /teams/* 11; /invites/* 4; /dashboard 1; /plans/current 1; /reminders/* 4; /activity 1; comentários/reactions 5; /templates/* 4; /calendar 1; /notifications/* 4; /push/* 3; /health 1. PushService, RemindersService, ActivityService e AdminBootstrapService também têm consumidores internos/operacionais, não só frontend.

## C. Código potencialmente removível

Nenhum módulo ou endpoint foi aprovado como removível.

| Candidato | Evidência atual | Risco e próxima ação |
|---|---|---|
| GoogleCallbackDto em apps/api/src/auth/auth.dto.ts | Busca não encontrou import/uso; callback lê code/state diretamente no controller. | Baixo; confirmar consumidor externo/reflection e remover em alteração pequena com testes (P3-01). |
| Dependências jose e zod | Sem referência localizada em src, test, scripts ou prisma; DTOs usam class-validator. | Confirmar tooling global antes de remover; atualizar lock e validar (P3-01). |
| Campo nonce do estado OAuth | Gerado/serializado/lido, sem consumo posterior; fluxo usa PKCE e userinfo. | Não é falha confirmada; revisar protocolo antes de simplificar (P3-09). |

## D. Future-ready e parcial

### Plans / Subscription — P3-02

- GET /plans/current escolhe subscription ativa mais recente; sem subscription usa o plano development do seed.
- Não existe billing real, consumidor frontend, entitlement comercial aplicado ou chamada de hasEntitlement fora de sua declaração.
- limitsJson é parseado sem validação de schema. hasEntitlement converte a chave com Boolean; uma string "false" seria verdadeira. É risco latente sem consumidor atual.
- Plan.isActive não é usado na seleção; não há constraint de subscription ativa única por usuário. O serviço escolhe a mais recente.
- Manter tabelas/seed até decidir billing, limites, fonte comercial e regra de entitlement.

### Persistência e escala futura

- SQLite é o provider efetivamente usado; PostgreSQL ainda não foi validado com credencial externa.
- scripts/validate-postgres.ps1 prepara validação limpa do schema PostgreSQL. Não reexecuta em PostgreSQL a história das 16 migrations SQLite.
- migration_lock.toml declara SQLite e há SQL específico do provider. Compatibilidade histórica, data/JSON e concorrência precisam ser provadas antes de produção (P2-DB-01).
- Storage atual é local e separado por tipo. Não foi identificada implementação de object storage nem varredura de órfãos.
- Limitadores por Map são locais ao processo e não compartilham estado entre réplicas.

## E. Duplicações e simplificações

| Tema | Evidência e avaliação |
|---|---|
| Timezone — P3-03 | auth/timezone.ts rejeita abreviações exceto UTC e exige “/”; common/timezone.ts delega ao Intl e aceita identificadores válidos. Sobreposição com semântica diferente; definir política antes de consolidar. |
| Storage — P3-04 | avatar-storage.ts, team-image-storage.ts e goal-photo-storage.ts repetem path/save/read/delete, com chaves e validações distintas. Abstração apressada pode enfraquecer traversal, autorização ou thumbnails. |
| Rate limit | AuthService.loginAttempts, AvatarsService.uploads e CommentsService.writes repetem Maps locais com limites diferentes. O risco de login está em P1; consolidar preservando a política de cada ação. |
| GoalsService — P3-09 | 488 linhas coordenam acesso, passos, progresso, recorrência, fotos e auditoria; candidato a decomposição depois de ampliar testes de contrato. |

## F. Prisma, schema e migrations

### Models

User, Account, Session, AuthToken, Category, Goal, GoalMember, GoalStep, GoalStepProgress, GoalDailyOccurrence, GoalDailyStepProgress, GoalPhoto, Team, TeamMember, InviteLink, InviteRedemption, Plan, Subscription, GoalAuditEvent, Reminder, ActivityEvent, Comment, Reaction, GoalTemplate, Notification, PushSubscription, AdminAuditLog.

### Restrições e observações

- Unicidades: GoalMember(goalId,userId), TeamMember(teamId,userId), GoalStepProgress(goalStepId,userId), GoalDailyOccurrence(goalId,localDate), progresso diário (occurrenceId,goalStepId,userId), tokenHash de convite, InviteRedemption(inviteLinkId,userId), Reaction(commentId,userId,emoji), código de Plan, Notification.deliveryKey e endpoint PushSubscription.
- Relações Goal/Team e dados subordinados usam Cascade/SetNull explícitos; AdminAuditLog mantém referências com SetNull.
- GoalPhoto limita slots por unicidade de autor/escopo/slot; capacidade também é aplicada no serviço.
- Subscription tem índices por usuário/plano, sem constraint de subscription ativa única.
- **P3-05 — índice redundante confirmado:** GoalDailyOccurrence declara @@unique([goalId, localDate]) e @@index([goalId, localDate]); migration 20260909110000_daily_goals_reminders cria ambos. Avaliar remover o segundo por nova migration, após validar SQLite/PostgreSQL. Não alterar histórico aplicado.
- tagsJson, metadataJson, limitsJson e stepsJson são texto, compatíveis com SQLite. limitsJson é parseado diretamente no serviço de planos.

As 16 migrations locais estão aplicadas e o schema valida. Schema/histórico não foram alterados.

## G. Dependências

| Dependência | Estado observado | Recomendação |
|---|---|---|
| @nestjs/platform-express@11.2.3 → multer@2.2.0 | Três FileInterceptors (avatar/equipe/meta) usam memoryStorage; limitam 1 arquivo e 5 MB, sem limites explícitos de fields/parts/nome. | P1-DEP-01: avaliar patch compatível com Nest 11 ou upgrade major; cobrir upload válido, abortado, nomes de campo e tamanho. Não aplicar npm audit fix nesta fase. |
| Advisories Multer | GHSA-wc9g-mqfw-jrwm (nomes de campo), GHSA-qfvm-cv95-jqjf (aborto/leak), GHSA-qvfw-j98x-7q72 (corrida de fileFilter), GHSA-535w-7cp7-47q4 (índice de array em nome). Três high e um low no detalhe. | Presença no pacote não prova explorabilidade igual em toda rota. memoryStorage reduz aplicabilidade de vetores de escrita/leak em disco; parser continua alcançável após autenticação. Revisar advisory por advisory. |
| @nestjs/core / platform-express | Correção automática aponta Nest 12.0.4, major em relação à linha 11. | Não atualizar em massa; procurar caminho compatível e testar. |
| jose, zod | Dependências diretas sem referências encontradas. | Candidatas a remoção após confirmação (P3-01). |
| Prisma | prisma e @prisma/client fixos em 6.12.0. | Preservar; sem upgrade. |
| argon2, sharp, web-push | Usados em autenticação, imagem e push. | Manter. |

## H. Segurança

### P1-SEC-01 — limitador público de login retém chaves sem limite global

AuthService mantém loginAttempts em Map por e-mail normalizado. Tentativa inválida de chave inédita adiciona entrada; resetAt só é verificado quando a mesma chave volta, sucesso apaga apenas essa chave. Não há varredura de expirados, limite global nem estado compartilhado. Como login é público e o cliente controla o e-mail, valores distintos podem aumentar indefinidamente a memória do processo. Em réplicas, contadores também não são compartilhados.

Impacto: consumo de memória e limite de força bruta inconsistente. Ação: usar limitador com expiração/cardinalidade controladas, compartilhado antes de escalar; testar expiração, chaves variadas e concorrência. Não implementado nesta fase.

### P1-DEP-01 — Multer runtime vulnerável em endpoints multipart

multer@2.2.0 está na cadeia runtime e é reportado por advisories high no npm audit. Avatar, imagem de equipe e foto de meta usam FileInterceptor autenticado, memoryStorage, limite de um arquivo e 5 MB. Isso restringe acesso e tamanho de arquivo, mas não elimina automaticamente ataques ao parser; não foram encontrados limites explícitos de partes/campos/nome.

Ação: identificar atualização segura compatível com Nest 11 ou planejar upgrade major, cobrir multipart malformado/abortado e impor limites de parser. Sem atualização nesta fase.

### Controles observados

- main.ts: helmet, cookie parser, filtro global de erros, CORS por allowlist e ValidationPipe com whitelist, forbidNonWhitelisted e transform.
- AuthGuard valida sessão não revogada/não expirada e usuário ativo; tokens de sessão são persistidos como hash.
- GoalsService.accessWhere contempla owner, membership direta, owner de equipe e membro de equipe. Handlers passam usuário autenticado aos serviços; UI não é controle de acesso.
- Administração exige AuthGuard mais requirePlatformAdmin/requireSuperAdmin; alterações de role/status registram auditoria.
- Tokens de convite são persistidos como hash; aceite revalida convite, capacidade e contexto no servidor.
- Fotos de meta são servidas por rota autenticada e vinculada ao Goal autorizado; uploads validam formato/dimensões com sharp.
- OAuth usa estado HMAC, comparação timing-safe, expiração, PKCE e e-mail verificado no userinfo. Nonce não é consumido; sem vulnerabilidade confirmada.
- Esta inspeção não confirmou bypass IDOR, segredo em logs ou dangerouslySetInnerHTML/eval no código revisado. Não substitui auditoria sistemática pré-produção.

## I. Performance e confiabilidade

### P2-PERF-01 — cardinalidade não limitada

- GoalsService.list retorna metas sem paginação e inclui categoria/equipe/membros/steps/progresso; DashboardService carrega tudo e agrega em memória.
- CalendarService aceita from/to arbitrários; valida data e end > start, mas não impõe janela máxima.
- RemindersService.processDue lê todos os lembretes vencidos e processa sequencialmente, sem limite de lote observado.
- ActivityListQueryDto limita limit a 50, mas offset não tem Max.

Não há medição de degradação atual. Definir paginação/janelas após medir volume e revisar contrato; não alterar API sem revisão.

### P2-TEST-01 — concorrência do limite de convites sem prova em PostgreSQL

Aceite de convite de meta verifica capacidade dentro de transação e grava membership/redemption; regra: owner + até 3 convidados. Não há invites.spec nem validação concorrente PostgreSQL. Requests simultâneos podem exigir isolamento/constraint/serialização além da contagem seguida de inserção. **Nenhuma violação foi reproduzida:** lacuna de evidência, não bug confirmado. Testar vários aceites simultâneos antes de habilitar PostgreSQL.

### P2-DB-01 — caminho PostgreSQL sem validação completa

Banco atual SQLite está atualizado. Validação PostgreSQL depende de URL/credencial SCRAM externa ausente. O script prepara migration limpa a partir de schema PostgreSQL temporário, mas não reexecuta toda a história SQLite em PostgreSQL. Gate de produção: decidir estratégia oficial, testar do zero e validar concorrência. Nenhuma migração nesta fase.

### P3-08 — cleanup físico de mídia best-effort

As classes de storage não têm rotina de varredura/reconciliação de órfãos. Alguns fluxos atualizam/removem registro no banco e tentam excluir o arquivo depois; falha pode deixar arquivo local órfão, geralmente registrada como warning/ignorada. Não indica exposição ou perda de registro ativo. Planejar dry-run e reconciliação por chave; não apagar arquivos sem prova.

## J. Cobertura de testes — P3-06

145 testes/23 arquivos. Há specs de auth/guard, perfil/sessão, OAuth, autorização de metas/activity, fotos, metas diárias, reminders, calendário, avatars, imagem de equipe, push, administração, timezone, env e health.

Lacunas:

- Sem specs dedicadas aparentes para Plans, Invites, Comments, Templates e Notifications; Teams tem teste de imagem, mas não CRUD/membros.
- Entre os testes encontrados, apenas health.spec importa AppModule; não há suíte E2E com banco real.
- Cobrir rollback de template/meta/steps, cleanup de mídia, isolamento de notificações, bootstrap CLI e transações PostgreSQL; concorrência de convites está classificada em P2-TEST-01.

Nenhum teste foi criado nesta fase.

## K. Divergências documentais — P3-07

1. README de rede local ainda orienta VITE_API_URL direto para IP:3000 e CORS para IP. docs/operation/local.md e .env.example usam same-origin: VITE_API_URL=/api, proxy Vite via API_PROXY_TARGET, API interna em 127.0.0.1:3000.
2. .env.example/código registram GOAL_PHOTO_STORAGE_DIR e apps/api/var/goal-photos; docs/operation/local.md documenta avatar/imagem de equipe, mas não armazenamento de fotos de metas.
3. docs/security-audit/audit-results.json registra 2026-08-31 e 37 handlers; leitura atual encontrou 87. Relatório anterior é histórico, não cobertura dos handlers posteriores. Renovar auditoria pré-produção conforme AGENTS.md.
4. AI_CONTEXT.md descreve ausência de billing/limites comerciais, coerente com código; manter Plans como preparação parcial explícita.

Nenhuma documentação normativa foi alterada.

## L. Plano de limpeza sugerido

### Onda 1 — baixo risco, após aprovação

- Confirmar globalmente e remover GoogleCallbackDto sem referências.
- Confirmar uso por tooling e remover jose/zod se permanecerem sem consumidor; atualizar lockfile e validar.
- Adicionar testes para invites, notifications e comments.

### Onda 2 — médio risco

- Corrigir cadeia Nest/Express/Multer com versões compatíveis e testes multipart; evitar upgrade major automático.
- Substituir limitadores locais por mecanismo com TTL/cardinalidade controlados, preservando limites por ação.
- Definir paginação/janelas para goals, dashboard, calendar, reminders e activity sem quebrar contrato sem revisão.
- Provar capacidade de convites sob concorrência e testar transações/falhas.
- Avaliar timezone/storage compartilhados sem apagar diferenças semânticas/de segurança.
- Remover o índice redundante por migration nova após validar SQLite/PostgreSQL.
- Corrigir instruções de rede local, documentar fotos e atualizar inventário de segurança.

### Onda 3 — decisão de produto

- Decidir se Plan/Subscription permanecem como preparação de billing; definir fonte comercial, limites, schema de limitsJson, significado de isActive, cardinalidade e entitlement.
- Depois decidir se /plans/current, seed development e hasEntitlement evoluem, são substituídos ou removidos.

### Onda 4 — arquitetura futura

- Validar migrações SQLite/PostgreSQL e concorrência numa instância real; documentar baseline/histórico oficial antes de produção.
- Migrar rate limiting/estado de processo para armazenamento compartilhado apenas com decisão operacional.
- Introduzir storage externo e reconciliação quando houver necessidade, preservando autorização e chaves opacas.

## Limites desta entrega

Esta fase produziu apenas o relatório. Não houve remoção funcional, mudança de regra/API, edição de schema/migration, atualização de dependência, alteração do frontend ou operação sobre arquivos de fotos. O próximo passo é revisar e aprovar explicitamente itens para a Fase 2.

## Atualização após Fase 2A — 22/09/2026

Esta atualização registra apenas as correções P1 tentadas após o baseline acima; as contagens e observações das seções anteriores descrevem a auditoria original.

| Achado | Situação atual |
|---|---|
| P1-SEC-01 — cardinalidade e expiração do limitador de login | Corrigido no processo: mantém 10 tentativas por e-mail em 15 minutos, guarda somente hashes SHA-256 de chave fixa, limita o Map a 10.000 entradas e remove expiradas por acesso e por rotina a cada 60 segundos. O limite de cardinalidade falha fechado para novas chaves. Ainda é local ao processo; rate limiting compartilhado deverá ser decidido antes de operar múltiplas réplicas. |
| P1-DEP-01 — Multer runtime | Aberto. A instalação continua resolvendo `multer@2.2.0`; `npm audit --workspace=@missionlive/api --omit=dev` continua reportando 3 vulnerabilidades high no grafo runtime relacionadas à cadeia Nest/Multer e quatro advisories Multer listados no baseline. Tentativas de override não alteraram a árvore instalada, então o override não foi mantido nem a dependência foi considerada corrigida. |

Como defesa complementar, os três FileInterceptors agora compartilham limites explícitos: arquivo único de até 5 MiB por rota, até três campos de texto, um arquivo, nomes de campo até 100 bytes e campos de até 8 KiB. Isso limita a entrada multipart, mas não elimina os advisories do Multer enquanto a versão instalada permanecer 2.2.0.

Foram adicionados testes unitários/de integração para o rate limiter e testes HTTP com parser Nest/Multer real para uploads válidos, limites, campos de arquivo incorretos, multipart malformado, autenticação e interrupção do cliente. Estado após a alteração: 25 suítes e 167 testes da API aprovados; typecheck, lint e build aprovados. Nenhum schema, migration, contrato de API ou frontend foi alterado nesta Fase 2A.

## Atualização Fase 2A.1 — 22/09/2026

**P1-DEP-01 — OPEN / UPSTREAM BLOCKED (tooling).** O ambiente da branch permanece em Node `v24.15.0`, npm `11.12.1`, Nest `11.2.3` e Multer `2.2.0`; o `package.json` declara `@nestjs/platform-express@^11.0.11` e o lockfile resolve a versão exata de Multer declarada por esse Nest. A árvore principal e o lockfile não foram alterados nesta tentativa.

O upstream foi revalidado: Multer `2.4.0` é a versão estável atual e contém as correções dos advisories relevantes; o Nest mais recente da linha 11 verificado (`11.2.5`) ainda declara Multer `2.2.0`. A linha npm 11 recebeu a correção do bug de overrides em workspaces a partir de `11.18.0`, sem exigir npm 12, mas essa versão do npm exige Node `^20.17.0 || >=22.9.0`, mais restritivo que o `engines.node >=20` do projeto. Referências: [changelog e releases do Multer](https://github.com/expressjs/multer/blob/main/CHANGELOG.md), [manifesto oficial do Nest 11.2.5](https://github.com/nestjs/nest/blob/v11.2.5/packages/platform-express/package.json), [issue npm/cli #9659](https://github.com/npm/cli/issues/9659), [backport npm/cli #9673](https://github.com/npm/cli/pull/9673) e [release npm 11.18.0](https://github.com/npm/cli/releases/tag/v11.18.0).

Experimentos foram feitos em worktrees descartáveis. Um override de raiz restrito a `@nestjs/platform-express`, com lockfile gerado pelo npm `11.19.1`, resultou em Multer `2.4.0`; uma instalação limpa `npm ci` executada com o npm local `11.12.1` instalou essa versão e `npm audit --workspace=@missionlive/api --omit=dev` reportou zero vulnerabilidades. O npm `11.19.1 ls --workspace=@missionlive/api multer` exibiu `2.4.0 overridden`; já o `npm ls` do npm local terminou com `ELSPROBLEMS`, marcando `2.4.0` como inválido em relação ao pin `2.2.0` do Nest. Mais importante, numa cópia limpa com o lock original, `npm update multer --workspace=@missionlive/api --package-lock-only` pelo npm `11.12.1` deixou o lock em `2.2.0`; a mesma atualização só produziu o lock corrigido com npm `11.19.1`. Portanto, adotar a resolução exigiria padronizar npm corrigido para manutenção/verificação do lockfile e reduzir o suporte efetivo do Node 20, uma mudança de tooling fora do escopo aprovado.

O teste de compatibilidade também encontrou uma diferença concreta: Multer `2.4.0` reporta campo de arquivo inesperado como `Unexpected file field`, enquanto o transformador do Nest 11.2.3 e 11.2.5 compara a mensagem antiga `Unexpected field`; os três testes de campo incorreto retornaram 500 no experimento. Uma adaptação mínima do filtro global, baseada em `MulterError` e códigos, recuperou 400 para erros multipart e 413 para tamanho, sem expor detalhes, e permitiu passar a suíte. Ela não foi trazida à branch porque a resolução da dependência não atende ao requisito de tooling atual; deverá acompanhar uma futura adoção explícita do override.

Validação no worktree experimental com a adaptação: 26 suítes e 170 testes da API aprovados; typecheck, lint e build aprovados; Prisma validate aprovado; audit de produção da API sem advisories. O `migrate status` contra SQLite temporário terminou com erro genérico do Schema Engine, sem detalhe, e não foi tratado como evidência sobre as migrations do projeto. O health check do backend local em execução respondeu HTTP 200. Nenhuma mudança de código, dependência, lockfile, schema ou migration foi mantida na branch. Reabrir quando o projeto aprovar um baseline de npm compatível com a correção de workspaces (e a respectiva compatibilidade de Node), ou quando Nest 11 atualizar oficialmente sua dependência/transformação para Multer corrigido.

## Atualização após Fase 2B — 22/09/2026

Esta seção registra cobertura e documentação adicionadas depois da baseline 2A.1. As contagens originais e o `audit-results.json` permanecem snapshots históricos: o JSON ainda descreve a auditoria de 31/08/2026 e 37 handlers, não a superfície atual.

| Área | Cobertura adicionada |
|---|---|
| Invites — 13 testes | Preview sem dados privados; convites expirados/revogados/inválidos; token persistido como hash, role server-side e validade de 24 horas; autorização de criação; bloqueio de compartilhamento direto de meta de equipe; aceite de meta/equipe, membership e redemption no callback transacional; idempotência, capacidade e revogação pelo criador. |
| Notifications — 4 testes | Listagem e contagem limitadas ao usuário; leitura individual sem acesso a IDs de outro usuário; leitura em massa limitada aos próprios avisos não lidos. |
| Comments — 6 testes | Listagem condicionada ao acesso à meta e filtro por goal; criação; edição/remoção por autor e moderação por owner/admin; reação permitida, remoção/toggle e bloqueio de acesso externo; janela existente de 30 gravações por usuário testada sem espera real. |
| Templates — 6 testes | Templates oficiais e pessoais escopados; criação a partir de meta acessível; preservação de categoria/tags/steps; uso de modelo oficial com datas; exclusão apenas do modelo pessoal do owner. |
| Teams — 6 testes | Listagem/detalhe escopados; criação e edição; fronteiras editor/admin/owner; proteção da propriedade; remoção de membros e recálculo das metas ativas; exclusão somente pelo owner. |
| Dashboard — 2 testes | Agregações derivadas apenas da lista escopada recebida de GoalsService e estado vazio. |

As seis suítes somam 37 casos adicionados. As verificações de convites confirmam a sequência dentro do callback de `$transaction` por mocks; não substituem testes de banco concorrentes. SQLite não comprova isolamento/concorrência PostgreSQL.

### Achado de confiabilidade — P2-TEMPLATE-01

`TemplatesService.use` cria a meta por `GoalsService.create` e adiciona cada step em chamadas subsequentes a `GoalsService.addStep`, sem uma transação externa envolvendo o fluxo inteiro. Se uma inclusão de step falhar após a criação da meta, a operação pode deixar uma meta parcial. A cobertura protegeu o caminho feliz sem codificar a falha como comportamento desejado; a correção de atomicidade fica pendente para fase própria.

### Documentação, limpeza e pendências

- README e `docs/operation/local.md` agora seguem a topologia `/api` via proxy Vite, registram `API_PROXY_TARGET` e documentam `GOAL_PHOTO_STORAGE_DIR`/`apps/api/var/goal-photos`. O storage real não foi lido, movido ou removido.
- Nenhum código de produção foi removido: os candidatos previamente encontrados estão protegidos por esta fase ou dependem de decisão adicional. Google OAuth, `jose`/`zod`, Plans/Subscription, Multer, provider/migrations PostgreSQL, timezone e abstrações de storage permaneceram inalterados.
- Não houve alteração de regra de produto, contrato de API, frontend, schema, migration ou dependência.
- `P1-DEP-01` continua `OPEN / UPSTREAM BLOCKED (tooling)`. PostgreSQL e concorrência real dos convites continuam sem validação por falta de ambiente/credenciais apropriados. O rate limiter permanece local ao processo para uma instância.
- A auditoria JSON de 31/08/2026 não foi reescrita; uma auditoria de segurança atualizada continua necessária antes de produção.
- Validação final: **API: 31 suítes / 204 testes; frontend: 14 arquivos / 75 testes; typecheck e lint globais aprovados; build global aprovado**. O bundle do frontend gerou apenas o aviso informativo do Vite para um chunk acima de 500 kB. `prisma validate` passou; `prisma migrate status` encontrou 16 migrations, todas aplicadas e schema atualizado. API `/health`, página frontend e proxy `/api/health` responderam HTTP 200. Nenhum schema, migration ou dado foi alterado.

## Atualização após Fase 2C — 22/09/2026

**P2-TEMPLATE-01 — CORRIGIDO.** O achado registrado na Fase 2B permitia que `TemplatesService.use` deixasse uma meta persistida sem todos os passos quando uma chamada posterior a `GoalsService.addStep` falhava.

`GoalsService` agora compartilha a preparação/validação dos dados de criação entre `create` e `createWithInitialSteps`. A segunda operação abre uma transação interativa Prisma e grava Goal e GoalSteps usando exclusivamente o mesmo `TransactionClient`; a posição de cada passo vem do índice da lista original. `TemplatesService.use` delega o fluxo atômico ao serviço de Goals e mantém o contrato/resposta, a autorização de templates pessoais e o tratamento vigente de templates oficiais.

O boundary inclui somente a persistência da meta e dos passos. Datas, categoria, tags, recorrência/timezone e autorização de equipe continuam centralizadas na validação compartilhada de Goals. Depois do commit, são emitidos os mesmos eventos do fluxo anterior: um `goal_created`, um `step_created` por passo e um `template_used`. O `ActivityService` segue responsável pelas notificações; nenhum evento ou aviso é criado antes da operação principal poder reverter. Erros de Activity continuam sendo aguardados e propagados, sem `catch` silencioso: como a atividade é pós-commit, uma falha nessa etapa pode retornar erro embora meta e passos permaneçam íntegros. Não há compensação ou garantia de atomicidade entre essas gravações secundárias.

A suíte `templates-atomicity.integration.spec.ts` usa um arquivo SQLite temporário dedicado e Prisma Client real, com uma falha de inserção provocada por trigger no banco. Falhas no primeiro, no passo intermediário e no último passo deixam inalteradas as contagens de GoalSteps e sem metas, eventos ou notificações do ator/participante. O caso de sucesso valida modelo pessoal, dados preservados, posição e ordem, `goal_created` + três `step_created` + `template_used`, e as notificações correspondentes para membro da equipe. O teste mantém templates oficiais e a autorização de equipe em regressões próprias. O arquivo temporário é isolado do banco de desenvolvimento e o schema/migrations do projeto não são alterados.

### Validação da Fase 2C

Na baseline antes das mudanças: API **31 suítes / 204 testes** e frontend **14 arquivos / 75 testes**. Após a implementação: API **32 suítes / 209 testes** e frontend **14 arquivos / 75 testes**; lint, typecheck e build globais passaram, `prisma validate` passou, `prisma migrate status` confirmou as 16 migrations aplicadas e o schema atualizado, e API `/health`, frontend e proxy `/api/health` responderam HTTP 200. O build do frontend manteve somente o aviso informativo já existente sobre um chunk acima de 500 kB.

## Atualização após Fase 2C.1 — 22/09/2026

O risco residual da Fase 2C era a divergência entre o commit de Goal/GoalSteps e a resposta HTTP: como Activity era gravada depois do commit, uma falha de `ActivityService.record()` podia retornar erro com a meta já persistida e induzir uma repetição da operação.

A investigação confirmou que `ActivityService.record()` possui somente persistência e consultas Prisma: cria `ActivityEvent`, consulta Goal/Team para calcular recipients e cria `Notification`. Não há Web Push, chamada HTTP, filesystem, timer ou outro efeito externo nesse método. A estratégia escolhida foi, portanto, torná-lo transaction-aware com um parâmetro opcional `Prisma.TransactionClient`. Sem esse parâmetro, todos os consumidores existentes preservam o comportamento anterior usando `PrismaService`.

No uso de template, o boundary final agora inclui, na mesma transaction Prisma e usando o mesmo client:

- criação do Goal;
- criação dos GoalSteps;
- um `goal_created`;
- um `step_created` por passo, na ordem original;
- um `template_used`;
- Notifications derivadas de cada evento.

`GoalsService` continua sendo a fonte das regras de criação e dos eventos de Goal/Step. `TemplatesService` fornece apenas o callback transacional que registra `template_used`, preservando a semântica do domínio sem mover a autorização ou duplicar validações. A busca final da representação da meta ocorre somente depois do commit. Activity não foi convertida em obrigatoriamente transacional para os outros fluxos.

Foi adicionado um cenário de integração com SQLite/Prisma real que cria um trigger de falha em `ActivityEvent` durante a transaction. O fluxo já havia sido validado para falha no primeiro, intermediário e último passo; agora também é validado quando a persistência de Activity falha depois de Goal e parte dos passos já terem sido escritas. Em todos os casos, Goal, GoalSteps, ActivityEvents e Notifications retornam às contagens anteriores. O caminho de sucesso continua validando os cinco eventos esperados, as notificações, os dados da meta, a ordem dos passos e a resposta final. Nenhum retry, fila, outbox, side effect externo, schema ou migration foi adicionado.

### Validação da Fase 2C.1

Após a implementação: API **32 suítes / 210 testes** e frontend **14 arquivos / 75 testes**; lint, typecheck e build globais passaram, `prisma validate` passou, `prisma migrate status` confirmou as 16 migrations aplicadas e o schema atualizado, e API `/health`, frontend e proxy `/api/health` responderam HTTP 200. O build do frontend manteve somente o aviso informativo já existente sobre um chunk acima de 500 kB.

## Atualização após Fase 2D — 22/09/2026

Esta atualização aplica guardrails operacionais de baixo risco, sem alteração de schema, migration, dependência, frontend ou contrato de resposta. A classificação desta rodada é:

| Área | Situação após Fase 2D |
|---|---|
| Calendar | **CORRIGIDO** — janela máxima de 366 dias validada no DTO e no serviço. |
| Reminders | **CORRIGIDO** — lote determinístico, teto por ciclo, isolamento por item e proteção contra sobreposição. |
| Activity | **CORRIGIDO/MITIGADO** — `offset` limitado a 10.000 pelo DTO, mantendo `nextOffset` e o formato da resposta. |
| Goals | **OPEN** — a listagem continua sem paginação; a análise de cardinalidade está registrada abaixo. |
| Dashboard | **OPEN** — continua derivando o resumo a partir da lista completa; read model permanece como proposta futura. |

### Calendar

`CalendarQueryDto` agora valida `from` e `to` como datas ISO antes do serviço. `CalendarService` mantém o default de 31 dias e rejeita intervalo invertido, datas inválidas e intervalos maiores que **366 dias**. O limite cobre o maior intervalo natural de um ano civil, inclusive ano bissexto, e continua compatível com o uso atual mensal do frontend. A resposta `{ from, to, goals, reminders }` não foi alterada.

Testes cobrem default, intervalo de 366 dias, rejeição do 367º dia e datas inválidas.

### Reminders

`RemindersService.processDue` passou a buscar lembretes pendentes vencidos em ordem determinística (`remindAt ASC, id ASC`) com lote de **100** itens e no máximo **5 lotes por ciclo** — teto de **500 tentativas por execução**. IDs já tentados não são buscados novamente no mesmo ciclo; portanto, uma falha individual não impede o restante do lote e o item continua pendente para o ciclo seguinte. O claim `pending → processing`, a transação por lembrete, o envio de push após commit e o isolamento de falhas foram preservados.

Uma flag local impede execuções sobrepostas na mesma instância e é liberada em `finally`, inclusive quando a consulta inicial falha. O limite é deliberadamente local ao processo: coordenação entre réplicas continua dependente de uma decisão operacional futura. O log de falha registra somente o identificador interno do lembrete e a consequência operacional, sem payload, token ou dados do usuário.

Testes cobrem lote menor que o limite, lote cheio, backlog acima de 500, ordem/teto, falha isolada, claim perdido, push com falha, sobreposição e liberação da trava após erro de infraestrutura.

### Activity

`ActivityListQueryDto.offset` agora aceita somente inteiros de 0 a **10.000**. O serviço continua usando `skip: offset`, `take: limit + 1` e retorna os mesmos `items`, `hasMore` e `nextOffset`; a alteração é apenas um limite defensivo contra paginações arbitrariamente profundas.

### Análise de cardinalidade de Goals e Dashboard

#### Forma atual e evidência medida

`GoalsService.list` executa uma busca de `Goal` autorizada por owner/membership/team e carrega, no mesmo fluxo, categoria, membros diretos com usuário, equipe com membros, steps ordenados, progresso do usuário por step e usuário responsável pelo step. Depois, se houver metas diárias, executa uma segunda busca de ocorrências atuais com `stepProgresses`. A serialização ainda calcula o progresso em memória e pode ordenar por progresso em memória.

`DashboardService.summary` chama `GoalsService.list(userId)` sem filtros e calcula em memória contagens, progresso médio, distribuições por categoria/contexto, timeline de seis meses e as listas limitadas de próximos vencimentos, atrasadas, quase concluídas e metas recentes. As cinco listas exibidas são limitadas depois de todos os dados terem sido carregados; isso não limita a consulta original.

Leitura somente no SQLite de desenvolvimento, sem criação ou alteração de dados, encontrou **13 goals, 24 steps, 11 progress rows, 10 memberships diretas, 4 team memberships, 1 ocorrência diária e 1 progresso diário**. Há 15 usuários no banco. Para um usuário com metas simples, a chamada observada fez 3–5 consultas SQL; para um usuário com metas compartilhadas/de equipe e uma meta diária, fez 8 consultas. O dashboard reutiliza essa mesma carga e não adiciona uma consulta de agregação própria; seu custo adicional atual é CPU/memória do processamento completo.

#### Crescimento aproximado

Como referência indicativa, repetindo as médias do banco de desenvolvimento (**~1,85 step por goal, ~0,85 progress row por goal e ~0,77 membership direta por goal**), a parte relacionada da carga tende a crescer assim:

| Goals acessíveis | Steps | Progressos filtrados do viewer | Memberships diretas |
|---:|---:|---:|---:|
| 10 | ~18 | ~9 | ~8 |
| 100 | ~185 | ~85 | ~77 |
| 500 | ~923 | ~423 | ~385 |

Esses valores são extrapolação de cardinalidade, não benchmark de latência. Em metas compartilhadas, também crescem membros da meta; em metas de equipe, membros da equipe podem ser reutilizados por várias metas; em qualquer caso, cada step pode carregar dados de assignee. Se todas as metas fossem diárias, a consulta adicional poderia carregar aproximadamente uma ocorrência atual por meta e seus progressos diários, adicionando mais uma relação linear ao volume de steps. O maior vetor de crescimento é, portanto, `goals → steps → progresses`, seguido por memberships/equipe/assignees e ocorrências diárias.

#### Proposta futura, sem implementação nesta fase

Manter o contrato atual do dashboard, mas substituir a carga completa por um read model/serviço de resumo que:

- use contagens e agregações filtradas por autorização para `total`, status, período, categoria e contexto;
- busque separadamente somente os cinco itens de cada lista de vencimento, atraso, quase conclusão e recentes;
- use uma consulta leve para a timeline de seis meses;
- deixe a lista detalhada de Goals com paginação explícita, incluindo ordenação estável e cursor/offset definido;
- preserve as mesmas regras de owner, membership, team membership e roles, sem confiar em filtros do frontend.

Não foi implementada paginação de Goals nem redesign/read model do Dashboard nesta rodada. Ambos permanecem **OPEN** e exigem decisão de contrato, benchmark com volume representativo e testes de autorização antes de mudança.

### Validação da Fase 2D

Os testes focados de Calendar, Activity e Reminders passaram com **21 testes**; a suíte de regressão ampliada (Calendar, Reminders, Activity, Dashboard e Goals authorization) passou com **8 suítes / 54 testes**. No gate integral, a API passou com **32 suítes / 223 testes** e o frontend com **14 arquivos / 75 testes**; lint, typecheck e build globais passaram, com apenas o aviso informativo já existente do Vite sobre um chunk acima de 500 kB. `prisma validate` passou, `prisma migrate status` confirmou **16 migrations** aplicadas e o schema atualizado, e `/health`, a página frontend e `/api/health` responderam HTTP 200.

## Atualização após Fase 2E.1 — Dashboard Read Model

### Situação e arquitetura

**Dashboard — CORRIGIDO para leitura integral de Goals.** `DashboardService.summary()` deixou de chamar `GoalsService.list(userId)`. A fachada pública delega para `DashboardReadService`, que combina consultas analíticas pequenas com uma hidratação em lote limitada aos cards realmente exibidos. **Goals — OPEN:** `GET /goals` continua sem paginação e será tratado na **Fase 2E.2 — Paginação de Goals**.

Antes, o Dashboard carregava e serializava todo o universo autorizado de metas, incluindo categoria, membros, equipe, steps, progresso e assignees, para depois calcular todas as métricas e aplicar `slice(0, 5)` nas listas. Isso fazia o custo das listas crescer junto com todas as relações de Goals.

Depois, o read model usa:

- cinco `count` filtrados pelo predicado de acesso para `total`, `completed`, `open`, `thisMonth` e `thisYear`;
- uma seleção escalar de categoria, `customCategory`, `teamId` e `_count.members` para os breakdowns;
- uma seleção somente de `completedAt` dentro das seis janelas mensais para a timeline;
- três buscas de IDs, cada uma com `take: 5`, para upcoming, overdue e recent, mantendo deadline/updatedAt como ordenação principal e acrescentando `id` como desempate estável;
- uma leitura mínima de metas ativas, participantes, assignment dos steps e progresso do viewer para calcular média e nearly complete;
- uma busca separada de `GoalDailyOccurrence` e `GoalDailyStepProgress` para metas DAILY, usando a data local de cada timezone;
- uma hidratação em lote por IDs com a serialização existente de `GoalsService`, sem fazer `get` individual por card.

A união das quatro coleções (`upcoming`, `overdue`, `nearly complete`, `recent`) tem teto teórico de **20 Goals completos**; sobreposição normalmente reduz esse número. A hidratação reaplica `goalAccessWhere(userId, ids)`, portanto IDs derivados internamente continuam sujeitos a owner, membership direta, owner de equipe e membership de equipe.

### Autorização e progresso

O predicado server-side foi extraído para `apps/api/src/goals/goal-access.ts` e é compartilhado pelo `GoalsService` e pelo read model. As regras de participantes e assignment (`ALL_PARTICIPANTS`, `SPECIFIC_PARTICIPANT`, assignee e participante válido) foram extraídas para `apps/api/src/goals/goal-progress.ts`, mantendo Goals como fonte semântica sem criar uma autorização paralela.

Para metas normais, a leitura traz somente o progresso do usuário autenticado e considera a aplicabilidade do step ao calcular os steps concluídos. O percentual é calculado por meta e depois é feita a média entre todas as metas ativas, preservando o arredondamento e o denominador de steps usado pelo Dashboard anterior. Metas sem steps continuam com progresso zero; `nearlyCompleteGoals` exige pelo menos um step e percentual mínimo de 75%.

Para metas DAILY, `GoalStepProgress` comum não é usado no cálculo. O read model determina `localDateAt(now, recurrenceTimezone)`, busca a ocorrência correspondente e usa somente `GoalDailyStepProgress` do viewer. A hidratação final também passa pela serialização diária existente, preservando `completedToday`, `occurrenceLocalDate` e `progressSummary`.

### Contrato e evidências

O controller e a resposta de `GET /dashboard` permanecem iguais: `counts`, breakdowns, timeline e as quatro coleções de Goals mantêm os mesmos nomes e formato. O frontend não foi alterado; seus cards continuam recebendo as metas serializadas necessárias para nome, prazo, contexto e progresso.

No SQLite de desenvolvimento, a leitura antiga observava aproximadamente 3–5 consultas em um caso simples e 8 em um caso compartilhado/de equipe/DAILY, sempre com hidratação completa do universo acessível. A leitura nova observada para os 15 usuários executou 12–28 consultas direcionadas, dependendo de listas e ocorrência, mas hidratou no máximo as metas finais; o usuário com cinco metas acessíveis hidratou cinco. O número de consultas não é tratado como SLA: o ganho é limitar relações transferidas e impedir que centenas de Goals completos sejam carregados.

### Testes da Fase 2E.1

- teste estrutural da fachada prova que `DashboardService` não chama `GoalsService.list`;
- fixture de contrato cobre counts, taxa, média por meta, categorias, contextos, timeline, deadlines, nearly complete, recent e estado vazio;
- teste estrutural com 500 Goals prova que a hidratação final não passa de 20 IDs;
- integração SQLite isolada cobre owner, usuário externo, membership direta, membership/owner de equipe, meta inacessível, assignment específico, meta DAILY com progresso comum conflitante e ocorrência atual;
- regressões existentes de Goals authorization e daily goals permanecem verdes.

Nenhum schema, migration, dependência, frontend, Calendar, Reminders, Activity, Templates, Multer ou PostgreSQL foi alterado. A próxima etapa provável é **Fase 2E.2 — Paginação de Goals**; ela não foi iniciada nesta fase.

### Validação da Fase 2E.1

Após a implementação: API **34 suítes / 226 testes** e frontend **14 arquivos / 75 testes**; lint, typecheck e build globais passaram, com apenas o aviso informativo já existente do Vite sobre um chunk acima de 500 kB. `prisma validate` passou, `prisma migrate status` confirmou **16 migrations** aplicadas e o schema atualizado, e API `/health`, página frontend e proxy `/api/health` responderam HTTP 200. O frontend permaneceu sem alterações.

## Atualização após Fase 2E.2 — Paginação de Goals

### Classificação P2-PERF

| Área | Situação após a 2E.2 |
|---|---|
| Goals | **CORRIGIDO para listagem/hidratação ilimitada.** `GET /goals` entrega páginas limitadas; em `progress-desc/asc`, a classificação global ainda exige leitura leve do conjunto filtrado, sem hidratar todos os Goals completos. |
| Dashboard | **CORRIGIDO**, conforme o read model da Fase 2E.1; permanece independente do envelope paginado. |
| Calendar | **CORRIGIDO pelo guardrail de 366 dias**, preservado; a consulta interna segue retornando `Goal[]` e não é truncada pela paginação pública. |
| Reminders | **CORRIGIDO**, conforme os guardrails da Fase 2D. |
| Activity | **CORRIGIDO/MITIGADO**, com `offset` limitado a 10.000 conforme a Fase 2D. |

### Contrato, filtros e autorização

Antes, `GET /goals` retornava `Goal[]`, carregava o conjunto autorizado completo com relações para a serialização e só então ordenava por progresso em memória. Agora retorna `{ items, pagination }`, com `page` mínimo 1 e padrão 1, `pageSize` padrão 12 e limitado a 50, `totalItems` e `totalPages`. Página solicitada acima da última é ajustada para a última página válida; sem resultados, o contrato é `page: 1`, `totalPages: 0` e `items: []`.

Busca, status, categoria, contexto, prazo, intervalos de início/fim e sort continuam server-side e são aplicados antes da paginação. O mesmo `where` combina esses filtros com `goalAccessWhere(userId)` para a contagem, candidatos de progresso e registros da página; assim, `totalItems` também respeita owner, membership direta, owner da equipe e membership da equipe. O controller mantém `GET /goals`, sem endpoint ou query genérica adicional.

Para `recent`, `name` e `deadline`, a consulta usa `count` e paginação `skip/take` no banco antes da hidratação das relações. As ordenações preservam `updatedAt DESC`, `name ASC` e `endDate ASC`, respectivamente, com `id ASC` como desempate determinístico; metas sem prazo mantêm o comportamento prévio do banco.

### Ordenação por progresso e hidratação

Para `progress-desc/asc`, o serviço seleciona globalmente apenas os campos necessários: IDs, `updatedAt`, owner/memberships de usuário, participantes da equipe, recorrência/timezone, assignment dos steps e progresso comum do viewer. `goalProgressForViewer` reutiliza as regras compartilhadas de participantes e aplicabilidade; steps não aplicáveis não entram no denominador. O serviço ordena o conjunto filtrado pelo percentual e, em empates, por `updatedAt DESC` e `id ASC`; somente os IDs da página são então carregados com relações completas e serializados no formato de Goal já usado pela aplicação.

Em Goals `DAILY`, o cálculo ignora progresso comum e consulta a ocorrência da data local atual derivada de `recurrenceTimezone`, junto apenas do `GoalDailyStepProgress` do viewer. A classificação usa essa ocorrência e as mesmas regras de assignment, preservando a semântica serializada da 2E.1.

O sort por progresso continua com trabalho linear no número de Goals autorizados e nos steps mínimos necessários para avaliá-los. Com 500 candidatos, esse custo linear foi mantido deliberadamente: a leitura é mínima e a hidratação completa continua limitada a `pageSize` (12 por padrão ou até 50), sem alegar custo constante ou adicionar cache/read model prematuramente. Otimizações adicionais ficam condicionadas a métricas reais.

### Calendar e consumidores internos

`CalendarService` não consome a nova resposta pública. Passa a chamar `GoalsService.listForCalendar(userId, start, end)`, caminho nomeado e específico que usa o predicado de autorização/filtros compartilhado, preserva retorno `Goal[]` e mantém o intervalo previamente validado de até 366 dias. Um cenário SQLite com 500 metas no intervalo confirma que o Calendar não perde registros por um `pageSize` implícito. Dashboard segue usando `DashboardReadService` e a hidratação por IDs da Fase 2E.1. A busca por chamadas internas à listagem encontrou o controller como consumidor de `GoalsService.list`; o Calendar foi isolado no caminho próprio, sem criar `listAll()` genérico. Templates e demais consumidores não foram alterados.

### Frontend

`api.goals` agora recebe `GoalsQuery` tipado e retorna `GoalsPage`; filtros booleanos, incluindo `hasDeadline=false`, são serializados corretamente. Página e filtros são refletidos na query string e restaurados em links diretos; as atualizações usam replace para não acumular uma entrada de histórico por interação. A página Metas conserva cards, grid, busca com debounce, filtros e estados existentes, exibe 12 itens por consulta e apresenta `Anterior`, `Página X de Y` e `Próxima` somente quando há mais de uma página. Os botões são controles reais com estado `disabled`, rótulos acessíveis e região `aria-live`. Toda mudança de busca/filtro/sort e a ação Limpar filtros retorna a página a 1; cleanup das requisições ignora respostas obsoletas, e uma página ajustada pelo backend sincroniza URL e dados sem ciclo extra de fetch.

### Escala, escopo e validação

O teste estrutural de 500 Goals comprova hidratação completa limitada à página tanto para sort no banco quanto para progress sort; no caso padrão, no máximo 12 Goals completos são serializados. O fixture confirma também autorização da contagem, filtros, limites de página, ordenações através da fronteira entre páginas, empates, assignment, ocorrência DAILY e o retorno integral do Calendar. Os testes de interface cobrem navegação, controles desabilitados/ocultos, reset de filtros e sort, debounce, resposta ajustada, cleanup/cancelamento, EmptyState e erro.

Revisão manual da tela Metas no navegador local confirmou a grade e os filtros no desktop e em viewport mobile de 390×844, sem overflow horizontal; o menu mobile recolhe para fora da área útil. O usuário de desenvolvimento possui apenas três metas visíveis, então a paginação não aparece nessa base; os estados de múltiplas páginas e a ação seguinte/anterior são exercitados pelos testes de interface e integração, sem inserir dados de teste no banco de desenvolvimento.

Não houve mudança em schema, migrations, dependências, DashboardReadService, Templates, Reminders, Activity, Multer, provider PostgreSQL, convites, OAuth ou Plans. Multer permanece **P1-DEP-01 — OPEN / UPSTREAM BLOCKED (tooling)**; PostgreSQL e concorrência de convites continuam sem validação nesta fase.

### Baseline e validação final da Fase 2E.2

Antes das alterações, a baseline estava verde: API **34 suítes / 226 testes**, frontend **14 arquivos / 75 testes**, lint, typecheck e builds; `prisma validate` passou, as **16 migrations** estavam aplicadas, e `/health`, frontend e `/api/health` respondiam HTTP 200.

Após as alterações: regressão focada em Goals, autorização, DAILY, Calendar e Dashboard passou com **7 suítes / 54 testes**; API completa passou com **35 suítes / 247 testes** e frontend com **15 arquivos / 84 testes**. Lint, typecheck e builds de API/web passaram. `prisma validate` passou e `prisma migrate status` confirmou as mesmas **16 migrations** aplicadas e schema atualizado. API `/health`, frontend `/` e proxy `/api/health` responderam HTTP 200. O Vite manteve o aviso informativo de chunk principal acima de 500 kB (791,99 kB), sem falha no build.

A inspeção manual da tela Metas em desktop e viewport mobile 390×844 confirmou filtros utilizáveis e ausência de overflow horizontal. O banco local apresenta três Goals para o usuário de teste, portanto os controles de múltiplas páginas não aparecem nessa sessão manual; botões, transições entre páginas e estados são cobertos por testes frontend automatizados, e nenhum dado foi inserido no banco local.
