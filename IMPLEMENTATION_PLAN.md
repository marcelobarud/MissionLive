# IMPLEMENTATION_PLAN.md — MissionLive V1

## Visão geral

Este plano organiza a implementação do MissionLive em fases incrementais.

Princípios:
- cada fase deve terminar em estado executável;
- segurança é transversal;
- migrations e testes acompanham features;
- nenhuma fase deve depender de "corrigir segurança no final";
- SQLite é temporário;
- PostgreSQL deve ser validado antes da produção;
- Capacitor fica fora da implementação V1.

## Status de execução

| Fase | Status |
|---|---|
| 0 — Bootstrap documental e repositório | CONCLUÍDA |
| 1 — Persistência e fundação NestJS | CONCLUÍDA |
| 2 — Shell frontend mobile-first | CONCLUÍDA |
| 3 — Users e autenticação local | CONCLUÍDA |
| 4 — Google OAuth | CONCLUÍDA / CONFIGURÁVEL |
| 5 — Categories e Goal core | CONCLUÍDA |
| 6 — Goal Steps e progresso individual | CONCLUÍDA |
| 7 — Metas compartilhadas e roles | CONCLUÍDA |
| 8 — Links de convite de meta | CONCLUÍDA |
| 9 — Equipes e memberships | CONCLUÍDA |
| 10 — Convites de equipe | CONCLUÍDA |
| 11 — Progresso coletivo e conclusão automática | CONCLUÍDA |
| 12 — Owner override | CONCLUÍDA |
| 13 — Dashboard e análises | CONCLUÍDA |
| 14 — Planos/entitlements | CONCLUÍDA |
| 15 — Hardening, UX e acessibilidade | CONCLUÍDA |
| 16 — PostgreSQL antes de produção | BLOQUEADA EXTERNAMENTE |
| 17 — Auditoria final de segurança | CONCLUÍDA |
| 18 — Fechamento V1 | CONCLUÍDA |

---

## Fase 0 — Bootstrap documental e repositório

**Status:** CONCLUÍDA — estrutura, scripts, builds e smoke tests validados.

### Objetivo
Criar a base de trabalho do projeto.

### Entregas
- estrutura raiz do repositório;
- `apps/web`;
- `apps/api`;
- workspaces/package manager coerente;
- `.gitignore`;
- `.editorconfig`;
- `.env.example` seguro;
- README inicial;
- scripts raiz;
- documentação presente;
- CI mínima opcional se não exigir credenciais externas.

### Validação
- instalação limpa;
- frontend sobe;
- backend sobe;
- nenhum segredo real;
- builds básicos funcionam.

---

## Fase 1 — Decisão de persistência e fundação NestJS

**Status:** CONCLUÍDA — Prisma, schema/migration SQLite, seed e fundação NestJS validados.

### Objetivo
Definir camada de banco e preparar migrations SQLite/PostgreSQL.

### Entregas
- comparação técnica curta entre opções adequadas;
- escolha documentada do ORM/query layer;
- configuração SQLite;
- estrutura para PostgreSQL;
- migrations;
- health endpoint;
- configuração segura de ambiente;
- tratamento central de erros;
- validação global de DTOs;
- base de testes backend.

### Segurança
- startup rejeita secrets obrigatórios ausentes/inseguros;
- sem defaults públicos usados como segredo;
- sem credenciais reais no repo.

### Validação
- migration do zero em SQLite;
- testes;
- lint/typecheck/build.

---

## Fase 2 — Shell frontend mobile-first

**Status:** CONCLUÍDA — rotas, navegação responsiva, estados vazios e base visual validados.

### Objetivo
Criar a fundação visual e de navegação.

### Entregas
- React/Vite/TS configurado;
- rotas;
- layout mobile-first;
- navegação para Início, Metas e Equipes;
- componentes base;
- estados loading/error/empty;
- design tokens simples;
- responsividade desktop progressiva.

### Validação
- build;
- lint/typecheck;
- testes frontend básicos;
- navegação em viewport mobile.

---

## Fase 3 — Users e autenticação local

### Objetivo
Implementar cadastro/login por e-mail e senha com sessões seguras.

### Entregas
- `users`;
- `sessions`;
- `auth_tokens`;
- cadastro;
- login;
- logout;
- refresh/session lifecycle;
- verificação de e-mail preparada/implementada de forma local/configurável;
- recuperação de senha;
- telas Login/Cadastro/Recuperação;
- guards backend.

### Segurança
- hash forte de senha;
- tokens persistidos como hash quando aplicável;
- rate limiting;
- logs sem segredo;
- cookies/tokens conforme modelo seguro escolhido;
- testes de sessão revogada/expirada.

### Validação
- fluxo completo local;
- testes positivos e negativos.

---

## Fase 4 — Google OAuth e identidade unificada

### Objetivo
Adicionar login Google sem duplicar usuários.

### Entregas
- `accounts`;
- fluxo Google OAuth;
- vinculação segura de identidade;
- retomada de redirect;
- placeholders de env;
- documentação de setup.

### Segurança
- validar state/nonce/PKCE conforme fluxo adotado;
- validar e-mail/identidade conforme provider;
- não expor client secret no frontend;
- não criar conta duplicada silenciosamente.

### Validação
- testes com mocks;
- integração real somente se credenciais locais estiverem disponíveis.

---

## Fase 5 — Categories e Goal core

### Objetivo
Criar o núcleo de metas.

### Entregas
- `categories`;
- seed inicial;
- `goals`;
- CRUD de metas;
- categoria padrão ou customizada;
- tags embutidas;
- datas;
- status;
- tela de listagem em cards;
- criação prévia;
- detalhe;
- edição;
- remoção/cancelamento conforme política.

### Regras
- name <= 120;
- description <= 2000;
- custom category <= 60;
- até 10 tags;
- cada tag <= 30;
- start_date obrigatório;
- end_date opcional;
- end_date >= start_date.

### Segurança
- owner scope em toda rota;
- testes Usuário A/B;
- IDOR negativo para detalhe/update/delete.

---

## Fase 6 — Goal Steps e progresso individual

### Objetivo
Adicionar checklist binário.

### Entregas
- `goal_steps`;
- `goal_step_progress`;
- criação/edição/remoção/reordenação de steps;
- marcar/desmarcar próprio progresso;
- barras de progresso derivadas;
- meta sem steps válida.

### Segurança
- usuário nunca altera progresso alheio;
- validação de membership antes de progress mutation.

### Validação
- UNIQUE step/user;
- testes de progresso;
- testes de ordem;
- UI mobile.

---

## Fase 7 — Metas compartilhadas e roles

### Objetivo
Permitir compartilhamento direto sem equipe.

### Entregas
- `goal_members`;
- roles admin/editor/viewer;
- políticas centralizadas;
- owner + até 3 convidados;
- metas compartilhadas aparecem junto das individuais;
- indicador visual de compartilhamento;
- viewer altera apenas próprio progresso;
- editor edita estrutura;
- admin administra compartilhamento conforme política.

### Segurança
- limite validado no backend;
- member de uma meta não acessa outra;
- role escalation bloqueada;
- owner protegido.

---

## Fase 8 — Links de convite para meta compartilhada

### Objetivo
Criar convite genérico reutilizável dentro das regras.

### Entregas
- `invite_links`;
- `invite_redemptions`;
- token imprevisível;
- expiração 24h;
- revogação;
- fluxo aceitar/recusar;
- retomada após Login/Cadastro/Google;
- copiar link;
- compartilhar via Web Share API quando disponível;
- fallbacks amigáveis para e-mail/WhatsApp/Telegram sem armazenar destinatário.

### Segurança
- armazenar hash do token quando viável;
- revalidar capacidade no aceite;
- transação no redemption/membership;
- goal com team rejeita convite direto;
- link expirado/revogado rejeitado.

---

## Fase 9 — Equipes e memberships

### Objetivo
Implementar equipes como agrupador de membros e metas.

### Entregas
- `teams`;
- `team_members`;
- owner/admin/editor/viewer;
- cards de equipes;
- detalhe;
- participantes;
- CRUD permitido;
- criação de meta dentro de equipe;
- primeira meta no fluxo de criação da equipe.

### Regras
- metas são entidades separadas;
- `goal.team_id` referencia equipe;
- uma equipe pode ter várias metas;
- meta de equipe não usa `goal_members` para externos.

### Segurança
- somente membros acessam equipe/meta;
- admin/owner gerenciam conforme papel;
- viewer só visualiza e marca próprio progresso;
- editor não ganha gestão de membros;
- testes IDOR entre equipes.

---

## Fase 10 — Convites de equipe

### Objetivo
Permitir entrada segura em equipe via link genérico.

### Entregas
- invite link target `team`;
- role definida no servidor;
- expiração 24h;
- aceite explícito;
- retomada pós-auth;
- redemption idempotente;
- compartilhar por link/Web Share/fallbacks.

### Segurança
- membro externo não acessa antes do aceite;
- link não inclui permissão manipulável;
- team inexistente/revogada/expirada falha;
- concorrência de aceite tratada.

---

## Fase 11 — Progresso coletivo e conclusão automática

### Objetivo
Implementar regra final de conclusão.

### Entregas
- cálculo por participante;
- meta individual conclui quando owner completa todos steps;
- meta compartilhada conclui quando owner + todos convidados completam;
- meta de equipe conclui quando todos os membros aplicáveis completam;
- novo membro passa a contar em meta ativa;
- UI "seu progresso" e "progresso coletivo";
- `completed_at`;
- `completion_mode = automatic`.

### Concorrência
Conclusão automática precisa ser recalculada de forma consistente após:
- checkbox;
- entrada/saída de membro;
- adição/remoção de step;
- mudanças relevantes de membership.

---

## Fase 12 — Owner override e fechamento excepcional

### Objetivo
Permitir encerramento pelo owner sem falsificar dados.

### Entregas
- owner pode concluir meta com pendências;
- `completion_mode = owner_override`;
- `completed_by_user_id`;
- motivo opcional;
- modal/confirmação;
- visualização de participantes pendentes preservada;
- nenhum progress é alterado automaticamente.

### Segurança
- somente owner;
- admin não herda implicitamente esse poder;
- registrar ação de forma auditável.

---

## Fase 13 — Dashboard e análises V1

### Objetivo
Finalizar a tela Início.

### Entregas
Cards:
- metas concluídas;
- metas abertas;
- metas deste mês;
- metas deste ano.

Também:
- informação complementar de proporção no card de concluídas;
- gráficos simples;
- barras e feedbacks visuais de progresso;
- consultas escopadas ao usuário.

### Segurança
Agregações devem respeitar exatamente as mesmas regras de acesso de listagens/detalhes.

Testar vazamento por dashboard/agregação.

---

## Fase 14 — Planos e entitlements sem cobrança real

### Objetivo
Preparar o produto para assinatura sem inventar provider.

### Entregas
- `plans`;
- `subscriptions` ou estrutura equivalente;
- service de entitlement/limits;
- plano de desenvolvimento/default seguro;
- pontos de extensão para provider;
- UI de plano apenas se houver informação definida.

### Restrições
- não implementar cobrança real;
- não inventar preços;
- não escolher provider silenciosamente.

### Segurança
- limites/entitlements validados no backend;
- frontend apenas reflete.

---

## Fase 15 — Hardening, UX e acessibilidade

### Objetivo
Revisão funcional e visual da V1.

### Entregas
- responsividade;
- navegação mobile;
- acessibilidade básica;
- focus states;
- labels;
- feedback de ações;
- empty states;
- confirmação destrutiva;
- erros amigáveis;
- revisão de URLs controladas por usuário;
- revisão de XSS;
- revisão de headers/CORS;
- dependências.

### Validação
- frontend build;
- backend build;
- suíte completa;
- smoke tests.

---

## Fase 16 — PostgreSQL antes de produção

### Objetivo
Eliminar dependência de SQLite para produção.

### Entregas
- PostgreSQL configurável;
- migrations limpas do zero;
- compatibilidade de tipos;
- constraints e índices;
- testes contra PostgreSQL;
- documentação de migração/configuração;
- nenhum dado de produção real necessário.

### Validação
- aplicar migrations em banco vazio;
- testar rollback/upgrade quando suportado;
- suíte backend contra PostgreSQL;
- testar convites/memberships/progress com concorrência relevante.

---

## Fase 17 — Auditoria final de segurança

### Objetivo
Executar a auditoria integral definida pelo usuário.

### Categorias
1. isolamento de owner/tenant/membership;
2. permissões definidas apenas no navegador;
3. IDOR em TODOS os handlers;
4. segredos hardcoded/config/histórico/bundle;
5. XSS/input.

### Entregas
- achados verificados com arquivo/linha/evidência/severidade;
- pontos fortes;
- recomendações priorizadas;
- issues completas para GitHub;
- script regenerável em `docs/security-audit/`;
- PDF:
  `docs/security-audit/relatorio-auditoria-seguranca.pdf`

### PDF
- pt-BR;
- A4;
- capa;
- resumo executivo;
- donut por severidade;
- barras por categoria;
- pontos fortes/fracos;
- tabela de achados;
- recomendações;
- issues GitHub;
- cabeçalho/rodapé;
- páginas revisadas visualmente.

Não fabricar achados.

---

## Fase 18 — Fechamento da V1

### Objetivo
Entregar estado consistente e documentado.

### Entregas
- README final;
- setup local;
- configuração SQLite;
- configuração PostgreSQL;
- Google OAuth documentado;
- known limitations;
- backlog V2;
- status de todas as fases;
- suite verde;
- build de produção;
- relatório de segurança presente;
- revisão de árvore Git.

### Backlog V2 sugerido
Sem implementar:
- Capacitor Android/iOS;
- gamificação real;
- XP/achievements/streaks;
- billing provider;
- push notifications;
- tipos avançados de objetivo;
- real-time;
- anexos/evidências.

---

# Definition of Done por fase

Uma fase só é concluída quando:
- implementação funcional terminou;
- migrations aplicáveis estão corretas;
- testes relevantes foram criados;
- testes existentes continuam passando;
- lint/typecheck/build aplicáveis passam;
- regras de segurança foram verificadas;
- documentação foi atualizada;
- não existem segredos reais no diff;
- commit de fase pode ser criado.

# Definition of Done da V1

- cadastro/login local;
- Google OAuth preparado/funcional conforme credenciais;
- metas individuais;
- metas compartilhadas owner + 3 convidados;
- equipes;
- roles;
- checklist;
- progresso individual;
- progresso coletivo;
- conclusão automática;
- owner override;
- convites por link 24h;
- dashboard;
- mobile-first;
- SQLite para desenvolvimento;
- PostgreSQL validado antes de produção;
- planos/entitlements preparados sem provider fictício;
- auditoria final executada;
- PDF de segurança gerado;
- documentação completa.
