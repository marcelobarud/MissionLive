# AI_CONTEXT.md — MissionLive

> Fonte principal de contexto funcional e técnico do projeto MissionLive.
> Este arquivo deve ser lido antes de qualquer planejamento ou implementação relevante.
> Quando uma decisão de produto for alterada, atualizar este documento no mesmo trabalho.

## 1. Identidade do produto

**Nome:** MissionLive

MissionLive é um SaaS mobile-first para criação e acompanhamento de metas individuais, compartilhadas e de equipes.

Casos de uso esperados incluem:
- metas pessoais;
- esportes e desafios;
- compras e planejamento;
- casais;
- famílias;
- equipes/grupos com um objetivo comum.

A V1 deve priorizar simplicidade, clareza de progresso, colaboração e segurança.

## 2. Modelo de negócio

O produto será oferecido por assinatura/mensalidade e terá planos de utilização.

A infraestrutura de planos e assinaturas deve ser preparada no domínio da aplicação, porém:
- o provedor de pagamentos ainda NÃO foi escolhido;
- não inventar Stripe, Mercado Pago ou outro provedor sem decisão explícita;
- não colocar segredos ou credenciais fictícias como defaults válidos;
- regras específicas de preço/limites dos planos ainda serão definidas.

## 3. Stack aprovada

### Frontend
- React
- TypeScript
- Vite
- abordagem mobile-first

### Backend
- Node.js
- TypeScript
- NestJS
- API REST desacoplada do frontend

### Banco
- SQLite durante desenvolvimento/protótipo
- PostgreSQL obrigatoriamente antes de produção

### Mobile futuro
- Capacitor para Android/iOS
- deve reutilizar o frontend web e a mesma API quando possível
- Capacitor não faz parte da V1 inicial, apenas deve ser preservada a compatibilidade arquitetural

### ORM/query layer
Prisma Client e Prisma Migrate foram escolhidos e documentados na ADR `docs/adr/0001-persistencia.md`.

- `prisma` e `@prisma/client` fixados em `6.12.0`;
- SQLite é o banco operacional de desenvolvimento;
- o schema mantém compatibilidade planejada com PostgreSQL;
- migrations, constraints, índices e transações são versionados no Prisma;
- `scripts/validate-postgres.ps1` prepara a migration limpa para a validação pré-produção.

Não trocar de ORM silenciosamente depois dessa decisão.

## 4. Princípios de arquitetura

1. Frontend nunca é autoridade de segurança.
2. Backend autentica, autoriza e valida escopo/posse em toda operação sensível.
3. Uma única entidade `Goal` representa metas individuais, compartilhadas e de equipe.
4. Equipe e meta são entidades independentes.
5. Uma equipe pode possuir várias metas.
6. Meta de equipe nunca pode ser compartilhada diretamente com alguém de fora da equipe.
7. Progresso individual é preservado mesmo quando o owner força o encerramento de uma meta.
8. Valores derivados, como percentuais de progresso, não devem ser persistidos se puderem ser calculados com segurança.
9. Evitar complexidade prematura. A V1 usa checklist binário, não sistemas avançados de objetivos.
10. Toda mudança de schema deve passar por migration versionada.

## 5. UX e telas principais

### 5.1 Início
Dashboard mobile-first com:
- ação "Criar nova meta";
- acesso rápido às metas;
- card de metas concluídas;
- card de metas abertas;
- card de metas deste mês;
- card de metas deste ano;
- gráficos simples de análise/progresso;
- elementos visuais que lembrem recompensa/progresso.

Não implementar gamificação funcional na V1.

Não haverá na V1:
- XP;
- níveis;
- streaks;
- moedas;
- achievements;
- rankings gamificados.

A "taxa de conclusão" não deve ser um card independente; pode aparecer como informação complementar em "Metas concluídas".

### 5.2 Metas
- cards para todas as metas acessíveis ao usuário;
- metas individuais e compartilhadas podem aparecer misturadas;
- metas compartilhadas devem ter indicação visual;
- abrir um card leva à visão detalhada/expandida;
- menu de ações no canto superior direito com ações permitidas, como editar/remover;
- permissões reais sempre validadas no backend.

### 5.3 Equipes
- cards de equipes;
- resumo por equipe;
- ao abrir uma equipe, mostrar participantes, metas, progresso, concluídos, pendentes e demais detalhes relevantes;
- metas da equipe ficam agrupadas no contexto da equipe;
- não permitir compartilhamento direto de uma meta interna da equipe para usuários externos.

## 6. Criação de meta

### Etapa prévia
Campos:
- Nome
- Descrição
- Tags
- Duração / datas
- Categoria
- Equipe? (sim/não)
- se equipe = sim: escolher equipe existente ou iniciar criação de equipe

### Construção
Após a pré-configuração:
- abrir área de construção da meta;
- permitir criar zero, um ou vários objetivos;
- objetivos são checklist simples;
- meta sem objetivos é válida.

## 7. Criação de equipe

Fluxo inicial:
- Nome da equipe
- Nome da primeira meta
- Duração
- Categoria
- depois usar a mesma experiência de construção da meta

Banco:
- criar `Team` e `Goal` separadamente;
- `Goal.team_id` referencia a equipe;
- não armazenar a meta diretamente dentro de `Team`.

## 8. Usuários e autenticação

### `users`
Campos conceituais:
- `id` UUID
- `email` único
- `name`
- `avatar_url` nullable
- `password_hash` nullable
- `email_verified_at` nullable
- `status` (ex.: active/disabled)
- `created_at`
- `updated_at`

`password_hash` pode ser nulo para contas exclusivamente OAuth.

### `accounts`
Para identidades externas:
- `id` UUID
- `user_id`
- `provider`
- `provider_account_id`
- timestamps
- UNIQUE (`provider`, `provider_account_id`)

Provider inicial:
- Google

### `sessions`
Controle explícito de sessão:
- `id`
- `user_id`
- hash do refresh token / credencial equivalente
- `expires_at`
- `revoked_at`
- timestamps

Nunca persistir refresh token sensível em texto puro.

### `auth_tokens`
Tokens temporários:
- verificação de e-mail;
- recuperação de senha.

Persistir hash do token, não o token puro.

### Regras
- cadastro por e-mail/senha;
- login por e-mail/senha;
- Google OAuth;
- um e-mail representa uma única identidade lógica do MissionLive;
- vinculação de Google a usuário existente deve ser segura;
- cadastro tradicional exige fluxo de verificação de e-mail;
- rate limiting em endpoints de autenticação;
- não registrar senhas, tokens ou segredos em logs.

### Administrador na V1

- A V1 não possui administrador global da plataforma no modelo `User`.
- `admin` é uma role contextual, válida apenas em `goal_members` ou `team_members`.
- O owner é a autoridade máxima do recurso e não deve ser confundido com uma role de membership.
- Uma conta administrativa local de desenvolvimento pode ser provisionada para testes, mas continua sujeita ao escopo dos recursos que possui ou dos quais participa.
- Credenciais locais não devem ser armazenadas neste documento, versionadas no repositório ou reutilizadas em produção.

## 9. Metas

### `goals`
Campos conceituais aprovados:
- `id` UUID
- `owner_user_id` UUID obrigatório
- `team_id` UUID nullable
- `name` obrigatório, máximo 120 caracteres
- `description` nullable, máximo 2000 caracteres
- `category_id` nullable
- `custom_category` nullable, máximo 60 caracteres
- `tags` armazenadas diretamente na meta
- `start_date` obrigatório
- `end_date` nullable
- `status`
- `completed_at` nullable
- `completion_mode` nullable
- `completed_by_user_id` nullable
- `completion_override_reason` nullable
- timestamps

### Status
V1:
- `active`
- `completed`
- `cancelled`
- `archived`

Não persistir `draft` inicialmente. O fluxo prévio pode existir no frontend até a confirmação da criação. Autosave/drafts podem ser adicionados depois.

### Datas
- `start_date` obrigatório;
- `end_date` opcional para permitir metas perenes;
- quando `end_date` existir, deve ser >= `start_date`.

### Tipos contextuais de meta
Não criar coluna `goal_type` apenas para diferenciar:

Meta individual:
- `team_id = null`
- sem participantes adicionais em `goal_members`

Meta compartilhada:
- `team_id = null`
- possui `goal_members`

Meta de equipe:
- `team_id != null`
- acesso herdado da equipe
- não pode usar compartilhamento direto externo

## 10. Categorias

Categorias pré-definidas pela aplicação.

Sugestão inicial de seed, ajustável:
- Pessoal
- Saúde
- Esportes
- Família
- Relacionamento
- Estudos
- Profissional
- Finanças
- Compras
- Viagem

A opção "Outro" é um comportamento de UI, não precisa ser uma categoria global persistida.

Modelagem:
- categoria padrão => `category_id` preenchido e `custom_category = null`;
- "Outro" => `category_id = null` e `custom_category` preenchido;
- nunca permitir os dois ao mesmo tempo;
- `custom_category`: trim, 2 a 60 caracteres.

Uma categoria personalizada de um usuário não vira automaticamente uma categoria global.

## 11. Tags

V1 sem tabela `tags` e sem `goal_tags`.

Tags ficam diretamente na meta como lista estruturada/JSON equivalente.

Regras:
- campo opcional: uma meta pode ter zero tags;
- máximo 10 tags por meta;
- máximo 30 caracteres por tag;
- trim;
- não aceitar itens vazios dentro da lista;
- não permitir duplicatas na mesma meta;
- comparação normalizada deve impedir duplicata apenas por espaços/maiúsculas/minúsculas;
- preservar uma forma de exibição amigável.

## 12. Goal Steps

### `goal_steps`
Checklist simples:
- `id` UUID
- `goal_id`
- `title`
- `description` nullable
- `position`
- timestamps

V1 suporta apenas:
- criação;
- ordenação;
- edição por usuário autorizado;
- remoção por usuário autorizado;
- marcação binária feito/não feito via progresso.

Não implementar na V1:
- quantidade;
- percentual manual;
- métricas;
- subtarefas hierárquicas;
- anexos obrigatórios;
- evidências;
- score;
- peso;
- XP.

## 13. Progresso individual

### `goal_step_progress`
- `id`
- `goal_step_id`
- `user_id`
- `completed` boolean
- `completed_at` nullable
- timestamps
- UNIQUE (`goal_step_id`, `user_id`)

O checklist estrutural é compartilhado, mas cada participante registra o próprio progresso.

Viewer:
- pode marcar/desmarcar o próprio progresso;
- não pode editar estrutura;
- não pode alterar progresso de outra pessoa.

## 14. Conclusão de metas

### Individual com steps
Concluída quando o owner concluir todos os steps.

### Compartilhada com steps
Concluída automaticamente apenas quando:
- owner;
- e todos os convidados participantes aplicáveis

tiverem concluído todos os steps.

### Meta de equipe com steps
Concluída automaticamente apenas quando todos os membros aplicáveis da equipe tiverem concluído todos os steps.

### Novo membro
Novo membro que entra em uma equipe/meta ativa:
- passa a contar no progresso coletivo;
- recebe o checklist existente;
- pode marcar steps antigos como concluídos se já os tiver realizado.

### Owner override
O owner pode encerrar/concluir uma meta mesmo com participantes pendentes.

Ao fazer isso:
- `status = completed`;
- `completion_mode = owner_override`;
- registrar `completed_by_user_id`;
- `completion_override_reason` opcional;
- NÃO marcar artificialmente steps de outros usuários;
- NÃO falsificar progresso individual;
- a UI deve continuar mostrando participantes/steps que não foram concluídos.

Conclusão automática:
- `completion_mode = automatic`.

### Meta sem steps
Como não existe checklist para derivar conclusão, a meta pode ser concluída manualmente por usuário autorizado conforme política implementada, preservando o owner como autoridade final.

## 15. Compartilhamento direto de metas

Somente para metas sem `team_id`.

Capacidade:
- owner + até 3 convidados;
- máximo total de 4 participantes no compartilhamento direto.

Essa regra deve ser validada no backend.

### `goal_members`
Campos:
- `id`
- `goal_id`
- `user_id`
- `role`
- `joined_at`
- timestamps
- UNIQUE (`goal_id`, `user_id`)

Papéis:
- `admin`
- `editor`
- `viewer`

Owner não precisa ser duplicado em `goal_members`; propriedade fica em `goals.owner_user_id`.

## 16. Equipes

### `teams`
- `id` UUID
- `owner_user_id`
- `name`
- `description` nullable
- `avatar_url` nullable/futuro
- timestamps

### `team_members`
- `id`
- `team_id`
- `user_id`
- `role`
- `joined_at`
- timestamps
- UNIQUE (`team_id`, `user_id`)

Papéis:
- `admin`
- `editor`
- `viewer`

Owner fica em `teams.owner_user_id`.

### Permissões conceituais
Owner:
- autoridade máxima;
- administra equipe;
- administra membros e papéis;
- cria/edita/remove metas;
- pode executar owner override de conclusão;
- não pode ser removido/rebaixado acidentalmente.

Admin:
- administra equipe conforme regras permitidas;
- gerencia membros e permissões não superiores ao owner;
- cria/edita/remove metas da equipe;
- não recebe automaticamente poderes exclusivos do owner.

Editor:
- pode editar conteúdo permitido de metas/steps;
- não gerencia propriedade;
- não deve ganhar administração de membros sem regra explícita.

Viewer:
- visualiza;
- marca/desmarca o próprio progresso;
- não edita estrutura;
- não altera progresso alheio.

### Regra crítica
Meta de equipe nunca pode ser compartilhada diretamente.

Para alguém acessar metas da equipe:
1. precisa entrar na equipe;
2. a entrada ocorre por convite/aceite;
3. o backend valida membership.

## 17. Convites / links de convite

A V1 usa link genérico.

Exemplo conceitual:
`/invite/<token>`

Características:
- token imprevisível;
- expira em 24 horas;
- pode ser compartilhado por copiar link, e-mail, WhatsApp, Telegram ou outros meios;
- abrir link não inclui ninguém automaticamente;
- usuário precisa estar autenticado e aceitar explicitamente;
- se não autenticado, redirecionar para Login/Cadastro/Google e depois retomar o convite;
- link não carrega role manipulável em query/path;
- role/target ficam no servidor.

Como o link é genérico e pode ser usado por mais de uma pessoa, modelar preferencialmente:

### `invite_links`
- `id`
- `token_hash`
- `target_type` (`team` | `goal`)
- `team_id` nullable
- `goal_id` nullable
- `role`
- `created_by_user_id`
- `expires_at`
- `revoked_at` nullable
- timestamps

Nunca persistir o token secreto em texto puro se não houver necessidade operacional.

### `invite_redemptions`
- `id`
- `invite_link_id`
- `user_id`
- `accepted_at`
- UNIQUE (`invite_link_id`, `user_id`)

Regras:
- goal invite só pode apontar para meta sem equipe;
- goal invite respeita owner + 3 convidados;
- team invite cria membership na equipe;
- link expirado/revogado não funciona;
- usuário já participante não cria duplicata;
- aceite deve ser transacional;
- capacidade/permissão deve ser revalidada no momento do aceite.

## 18. Segurança — baseline obrigatória

Segurança é requisito transversal desde a primeira fase.

### Categoria 1 — isolamento de dados
Identificar e aplicar mecanismo claro de isolamento por:
- usuário dono;
- membro de meta;
- equipe;
- papel/permissão.

Toda listagem, busca, detalhe, agregação, dashboard, relatório e exportação futura deve respeitar escopo.

### Categoria 2 — permissão no backend
Nunca confiar em:
- `isAdmin`;
- botão oculto;
- rota escondida;
- estado do React.

Toda ação sensível deve ter autorização equivalente no NestJS.

### Categoria 3 — IDOR
Toda rota que recebe ID precisa validar acesso ao recurso.

Exemplo proibido:
- buscar meta por ID e retornar sem checar owner/membership/team membership.

### Categoria 4 — segredos
Proibido:
- API keys hardcoded;
- JWT secrets hardcoded;
- credenciais default inseguras;
- segredos reais em `.env.example`;
- segredos no frontend;
- tokens em logs;
- secrets em Docker/CI/docs/scripts.

Startup deve falhar quando segredo obrigatório estiver ausente ou usar placeholder inseguro.

### Categoria 5 — XSS/input
Frontend:
- evitar `dangerouslySetInnerHTML`;
- sanitizar HTML/Markdown caso seja adicionado;
- validar URLs controladas por usuário;
- evitar `eval`/`new Function`.

Backend:
- DTOs e validação;
- escape/sanitização adequada em HTML de e-mail/templates;
- nunca interpolar input não confiável de forma insegura.

### Testes negativos obrigatórios
Criar sempre usuários distintos A/B e testar:
- A acessa seus recursos;
- A não acessa recursos privados de B;
- viewer não edita;
- editor não ganha admin;
- membro externo não acessa meta de equipe;
- token expirado/revogado falha;
- usuário não altera progresso de outro;
- limite owner + 3 convidados é respeitado.

## 19. Planos e assinaturas

O domínio básico já existe na V1, sem cobrança real.

### `plans`
- `id`
- `code`
- `name`
- dados de exibição/limites
- `is_active`

### `subscriptions`
- `id`
- `user_id`
- `plan_id`
- `status`
- período
- provider nullable enquanto não escolhido
- provider_subscription_id nullable
- timestamps

O endpoint autenticado `GET /plans/current` retorna uma assinatura ativa quando existir ou o plano seguro `development` como fallback local. O service de entitlement existe, mas limites pagos ainda não estão configurados nem aplicados a recursos específicos.

Não implementar cobrança real sem provedor escolhido.

A autorização de recursos pagos deve ocorrer no backend por entitlement/plan, nunca apenas escondendo UI.

## 20. Banco e migração PostgreSQL

SQLite serve para desenvolvimento/protótipo.

Estado atual: migrations e script de validação PostgreSQL estão preparados, mas a execução real continua bloqueada externamente neste ambiente porque não foi fornecida uma URL/credencial SCRAM. PostgreSQL ainda não deve ser considerado validado para produção.

Antes de produção:
- PostgreSQL passa a ser banco oficial;
- executar migrations limpas do zero;
- validar constraints;
- validar índices;
- validar unicidade;
- validar transações;
- validar concorrência de convite/membership;
- validar comportamento de datas/JSON;
- executar suíte completa contra PostgreSQL.

Não depender de comportamento específico do SQLite que quebre no PostgreSQL.

## 21. Estado atual da implementação

### API/backend disponível

- autenticação local com cadastro, verificação de e-mail, login, logout, sessões em cookie HttpOnly e recuperação de senha por token exposto apenas no desenvolvimento;
- adaptador Google OAuth configurável com state assinado e PKCE, ainda sem execução real por falta de credenciais;
- CRUD de metas com escopo por owner, membership direta ou membership de equipe;
- categorias, categoria personalizada, tags, datas e status no backend;
- steps, reordenação, progresso próprio, conclusão automática, arquivamento e owner override auditado;
- convites de metas/equipes com token hash, expiração de 24 horas, aceite explícito, revogação e limite de três convidados em meta compartilhada;
- equipes, memberships, roles e autorização no backend;
- dashboard escopado e endpoint de plano/entitlement de desenvolvimento;
- ValidationPipe global, Helmet, CORS configurável, filtro global de erros e validação de `SESSION_SECRET` no startup.

### Frontend web disponível

- login, cadastro e verificação de e-mail em desenvolvimento;
- dashboard com cards, taxa derivada e barra de progresso;
- listagem, criação completa e edição inicial de metas, detalhe com datas/tags/contexto/participantes/progresso, CRUD de steps, cancelamento, arquivamento, owner override e convite direto de meta;
- listagem, criação básica e criação transacional de equipe com primeira meta/steps, detalhe, edição, gerenciamento de roles/membros e convite de equipe;
- preview e aceite de convite em `/invite/<token>`;
- recuperação e redefinição de senha em desenvolvimento;
- navegação responsiva mobile-first com estados de loading, erro e vazio.

### Diferenças conhecidas entre o alvo da V1 e a interface atual

- a interface web ainda não possui edição/cancelamento de membros de meta nem listagem persistida de convites já criados após recarregar a página;
- `categoryBreakdown` já é calculado no dashboard da API, mas ainda não é renderizado como gráfico no frontend;
- algumas operações administrativas avançadas permanecem limitadas à API; recuperação de senha usa token local no desenvolvimento e ainda não possui entrega de e-mail em produção;
- compartilhamento usa Web Share API quando disponível, com cópia para clipboard e atalhos de e-mail/WhatsApp/Telegram como fallback.

Essas diferenças são limitações de superfície da interface, não autorização implícita: o backend continua sendo a autoridade para escopo, roles e alterações sensíveis.

## 22. Fora do escopo da V1

- gamificação funcional;
- XP;
- achievements;
- streaks;
- rankings;
- Capacitor publicado em lojas;
- billing provider real sem decisão;
- compartilhamento direto de meta de equipe;
- tipos avançados de objetivos;
- anexos/evidências obrigatórias;
- colaboração em tempo real/WebSocket, salvo necessidade validada;
- permissões customizadas arbitrárias/RBAC complexo.

## 23. Documentos de execução

Ordem de leitura para Codex:
1. `AI_CONTEXT.md`
2. `AGENTS.md`
3. `IMPLEMENTATION_PLAN.md`
4. `GOAL.md`

O código deve refletir esses documentos.
Se uma implementação exigir contrariar uma decisão registrada:
- não fazer silenciosamente;
- documentar o conflito;
- escolher a alternativa mais conservadora apenas quando necessário;
- atualizar os documentos quando a decisão mudar oficialmente.
