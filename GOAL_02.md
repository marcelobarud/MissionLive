# GOAL_02.md — MissionLive Plano 02

## Objetivo mestre

Executar integralmente o `IMPLEMENTATION_PLAN_02.md`, da **Fase 19 à Fase 35**, transformando a primeira versão funcional do MissionLive em um produto mais completo, rico, colaborativo e visualmente orientado à sensação de avanço.

## Ordem obrigatória de leitura

Antes de editar:
1. `AI_CONTEXT.md`
2. `AGENTS.md`
3. `IMPLEMENTATION_PLAN.md`
4. `IMPLEMENTATION_PLAN_02.md`
5. `GOAL_02.md`
6. estado real do repositório
7. branch, working tree e commits recentes

Documentação é contexto; código é evidência.

## Regra principal

Uma feature só termina quando:
- domínio/schema;
- backend;
- frontend;
- integração;
- segurança;
- testes;
- build;
- documentação

estiverem coerentes.

Se backend já possui a capacidade, validar e completar a superfície frontend em vez de reimplementar.

## Sequência obrigatória

Executar:
- F19 Auditoria de paridade
- F20 Paridade de Metas
- F21 Paridade de Equipes/Convites/Conta
- F22 UX de progressão
- F23 Dashboard V2
- F24 Busca/filtros/ordenação
- F25 Lembretes
- F26 Feed de atividade
- F27 Comentários/reações
- F28 Templates/duplicação
- F29 Calendário/Timeline
- F30 Em ritmo
- F31 Onboarding
- F32 Perfil/preferências
- F33 Notificações internas
- F34 Hardening integrado
- F35 Fechamento

Não iniciar features novas antes de concluir a paridade V1 relevante, salvo bloqueio técnico documentado.

## Status

Manter tabela de status em `IMPLEMENTATION_PLAN_02.md`:
- PENDENTE
- EM ANDAMENTO
- CONCLUÍDA
- BLOQUEADA EXTERNAMENTE

## Commits

Ao final de cada fase:
1. revisar diff;
2. validar migrations;
3. executar testes;
4. lint/typecheck/build;
5. atualizar docs;
6. criar commit `Fase N — <descrição>`.

Não fazer push sem solicitação explícita.
Evitar agrupar múltiplas fases no mesmo commit.

## Requisito transversal — progressão/recompensa

A experiência deve comunicar avanço com:
- barras;
- percentuais;
- X de Y;
- quase lá;
- resumo de conclusão;
- microfeedback;
- celebração discreta;
- avanço coletivo;
- metas próximas de terminar;
- ritmo;
- atividade recente;
- reações.

Não implementar:
- XP;
- level;
- moeda;
- ranking;
- streak;
- badges colecionáveis;
- loja;
- recompensa monetária.

Visual maduro, clean e positivo.

## Segurança

Preservar baseline existente em todas as novas features.

### Isolamento
Escopar:
- goals;
- teams;
- reminders;
- activity;
- comments;
- reactions;
- notifications;
- dashboard.

### Backend é autoridade
Nunca confiar em gates do React.

### IDOR
Toda rota com ID valida recurso + usuário + membership/role.

### Segredos
Não adicionar secrets reais, defaults inseguros ou segredos no frontend.

### XSS/input
Atenção especial a comentários, nomes, descrição, templates, links e compartilhamento.
Comentários são texto simples na V1.

## Testes negativos mínimos

Manter cenários:
- A não acessa dados de B;
- viewer não edita;
- editor não escala role;
- externo não acessa team;
- team goal não aceita share direto;
- usuário não altera reminder alheio;
- usuário não vê activity externa;
- usuário não comenta/reage fora do escopo;
- notification deep link revalida acesso;
- filtros/agregados não vazam dados;
- owner override continua exclusivo;
- convite expirado/revogado falha.

## Dashboard V2

Responder rapidamente:
1. o que concluí;
2. o que está aberto;
3. o que está quase terminando;
4. o que está atrasado;
5. o que vence em breve;
6. como metas se distribuem;
7. o que aconteceu recentemente;
8. o que merece atenção.

Não transformar em BI corporativo.

## Lembretes

Reminder é individual.
Timezone explícito.
Sem provider externo inventado.
Priorizar notificação interna e preparar push futuro.

## Feed de atividade

É domínio de produto, não log técnico.
Metadata mínima.
Usuário só vê eventos de recursos acessíveis.

## Comentários e reações

Objetivo: apoio, contexto e reconhecimento.
Sem chat em tempo real.
Texto simples.
Reações idempotentes e limitadas.

## Templates e duplicação

Nunca duplicar:
- progresso;
- members;
- roles;
- invites;
- comments;
- reactions;
- activity;
- completion state.

## Calendário

Priorizar mobile-first.
Evitar biblioteca pesada sem justificativa.
Datas e timezone consistentes.

## Indicador Em ritmo

Heurístico, não previsão.
Comparar tempo transcorrido × progresso.
Fórmula e thresholds documentados.
Não persistir percentuais derivados.

## Onboarding

Curto, pulável e não bloqueante.
Usuário vindo por convite resolve convite primeiro.

## Perfil

Timezone alimenta reminders/calendário.
Não implementar exclusão definitiva/transferência de owner sem regra previamente definida.

## Notificações

Notificação informa; não autoriza.
Deep link sempre revalida acesso.

## PostgreSQL

O estado atual continua não validado em produção.

Se ambiente PostgreSQL aparecer:
- executar validação pendente;
- migrations do zero;
- suíte;
- corrigir incompatibilidades;
- atualizar contexto.

Se não aparecer:
- manter BLOQUEADA EXTERNAMENTE;
- não declarar produção pronta;
- continuar o restante possível.

## Google OAuth

Se credenciais reais não existirem:
- manter integração configurável;
- mocks/testes;
- não bloquear fases independentes.

## Dependências e performance

Antes de adicionar biblioteca:
- justificar;
- verificar manutenção;
- evitar duplicação;
- avaliar bundle.

Para feeds/comments/notifications/filtros:
- paginação;
- limites;
- índices;
- evitar N+1;
- não carregar histórico ilimitado no Dashboard.

## Acessibilidade e responsividade

Validar:
- teclado;
- foco;
- labels;
- contraste;
- touch targets;
- reduced motion;
- mobile estreito;
- mobile comum;
- tablet;
- desktop.

## Bloqueios externos

Quando houver:
- implementar adapter/interface;
- mocks;
- testes;
- documentação;
- marcar somente a parte externa como bloqueada;
- continuar o GOAL.

## Fechamento da F35

Produzir `docs/PLANO_02_FECHAMENTO.md` com:
1. fases;
2. commits;
3. migrations;
4. endpoints;
5. telas;
6. componentes de progressão;
7. Dashboard V2;
8. filtros;
9. reminders;
10. activity;
11. comentários/reações;
12. templates;
13. calendário;
14. Em ritmo;
15. onboarding;
16. perfil;
17. notifications;
18. testes;
19. lint/typecheck/builds;
20. segurança;
21. PostgreSQL;
22. Google OAuth;
23. Git;
24. backlog.

## Critério final

Só declarar GOAL 02 concluído se:
- F19–F35 estiverem concluídas ou bloqueadas apenas externamente;
- paridade estiver documentada e resolvida;
- progressão visual estiver consistente;
- novas features tiverem frontend + backend;
- segurança tiver sido revisada;
- testes/builds passarem;
- docs estiverem atualizadas;
- fechamento existir;
- nenhum segredo tiver sido introduzido;
- nenhum push tiver sido feito sem solicitação explícita.

Não declarar sucesso sem evidência verificável.
