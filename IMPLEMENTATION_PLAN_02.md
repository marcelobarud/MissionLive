# IMPLEMENTATION_PLAN_02.md — MissionLive

> Continuação do `IMPLEMENTATION_PLAN.md` original.  
> Numeração global preservada: este plano começa na **Fase 19**.  
> Base obrigatória: `AI_CONTEXT.md`, `AGENTS.md`, `IMPLEMENTATION_PLAN.md` e estado real do repositório.

## Objetivo do Plano 02

O Plano 02 corrige a assimetria atual entre backend e frontend e transforma o MissionLive em uma experiência mais rica, colaborativa e orientada à sensação de avanço.

Princípios:
- feature só é concluída quando domínio, backend, frontend, integração, segurança e testes estão prontos;
- frontend nunca é autoridade de segurança;
- progressão visual é requisito de UX;
- não implementar XP, níveis, moedas, streaks, ranking ou gamificação funcional;
- manter mobile-first;
- não fingir que PostgreSQL ou Google OAuth real estão validados quando ainda houver bloqueio externo.

## Regra transversal — sensação de progressão e recompensa

Usar de forma consistente:
- barras/anéis de progresso;
- percentuais derivados;
- `X de Y objetivos`;
- estados como Começando, Em progresso, Quase lá, Concluída, Em ritmo, Atenção e Adiantada;
- microfeedback ao marcar step;
- celebração visual discreta ao concluir meta;
- progresso coletivo;
- próximos marcos;
- atividade recente;
- reações sociais;
- resumo de conclusão.

Não persistir valores derivados quando puderem ser calculados com segurança.

## Estrutura obrigatória de cada fase funcional

Cada fase deve revisar:
A. Domínio/dados  
B. Backend/API  
C. Frontend/UX  
D. Integração ponta a ponta  
E. Segurança  
F. Testes/build/documentação  

---

## Fase 19 — Auditoria de paridade Frontend × Backend

**Status:** CONCLUÍDA — matriz de endpoints, rotas, campos, permissões, testes e gaps criada em `docs/parity/frontend-backend-parity.md`.

### Objetivo
Mapear tudo que existe no backend e ainda não possui superfície web equivalente.

### Entregas
Criar `docs/parity/frontend-backend-parity.md` contendo:
- controllers/endpoints;
- páginas/rotas frontend;
- campos suportados pela API;
- ações disponíveis na UI;
- permissões;
- testes;
- status de cada capacidade.

Mapear especialmente:
- campos de criação/edição de meta;
- cancelamento/arquivamento;
- members/roles;
- convites de equipe;
- detalhe de equipe;
- criação da primeira meta na equipe;
- recuperação de senha;
- `categoryBreakdown`;
- Web Share/fallbacks.

### DoD
Matriz completa e backlog objetivo para F20/F21.

---

## Fase 20 — Paridade frontend de Metas

**Status:** CONCLUÍDA — formulários completos, detalhe com contexto/progresso, edição, cancelamento, arquivamento, steps e convites integrados.

### Objetivo
Expor no frontend todas as capacidades V1 já suportadas pelo backend.

### Criação/edição
Expor:
- nome;
- descrição;
- tags;
- start date;
- end date opcional;
- categoria;
- opção Outro;
- categoria personalizada;
- equipe quando aplicável;
- zero ou vários steps.

### Detalhe
Exibir:
- status;
- datas;
- categoria/tags;
- owner;
- contexto individual/compartilhada/equipe;
- progresso próprio;
- progresso coletivo;
- participantes;
- motivo de owner override quando existir.

### Ações
Conforme autorização real:
- editar;
- cancelar;
- arquivar;
- remover conforme política;
- owner override;
- CRUD/reorder de steps;
- criar/revogar convite de meta;
- copiar link.

### Segurança
Testar owner/admin/editor/viewer e IDOR.

### DoD
Fluxo completo browser → API → banco; reload preserva estado; testes e builds verdes.

---

## Fase 21 — Paridade frontend de Equipes, Convites e Conta

**Status:** CONCLUÍDA — detalhe e criação transacional de equipes com primeira meta, roles/membros, convites e recuperação de senha disponíveis na web.

### Equipes
Implementar:
- detalhe completo;
- descrição;
- participantes/roles;
- owner;
- metas;
- criar meta dentro da equipe;
- editar equipe;
- ações de membros conforme papel.

### Criação de equipe
Fluxo:
1. equipe;
2. primeira meta;
3. steps;
4. confirmação;
5. criação coerente/transacional.

### Convites
Expor:
- criar;
- revogar;
- copiar;
- preview;
- aceitar/recusar;
- Web Share API quando disponível;
- fallback para copiar link;
- atalhos para e-mail/WhatsApp/Telegram quando apropriado.

### Conta/Auth
Completar UI de:
- recuperação de senha;
- redefinição;
- sessão expirada;
- verificação de e-mail.

### DoD
Matriz da F19 atualizada e paridade V1 relevante concluída.

---

## Fase 22 — Sistema visual e UX de progressão

**Status:** CONCLUÍDA — componentes de progresso, estados de conclusão, marcos, contexto e participantes aplicados ao fluxo web.

### Objetivo
Criar linguagem visual única para progresso/recompensa.

### Componentes
Criar/reutilizar:
- `ProgressBar`;
- `ProgressRing` quando útil;
- `ProgressSummary`;
- `CompletionState`;
- `MilestoneHint`;
- `CelebrationFeedback`;
- `StatusChip`;
- `ContextBadge`;
- `MemberProgressRow`.

### Regras
- feedback curto ao marcar step;
- rollback visual em erro;
- conclusão com celebração discreta e resumo;
- progresso coletivo claro;
- respeitar `prefers-reduced-motion`;
- não depender só de cor.

### DoD
Dashboard, Metas e Equipes usam linguagem consistente.

---

## Fase 23 — Dashboard V2 e indicadores enriquecidos

**Status:** CONCLUÍDA — progresso ativo, quase concluídas, prazos próximos/atrasados e distribuição por contexto/categoria disponíveis na API e no dashboard web.

### Manter
- Metas concluídas;
- Metas abertas;
- Metas deste mês;
- Metas deste ano.

Taxa de conclusão permanece informação complementar.

### Adicionar
- progresso médio das metas ativas;
- próximos prazos;
- metas atrasadas;
- progresso por contexto: individual/compartilhada/equipe;
- gráfico de categorias usando `categoryBreakdown`;
- evolução temporal de metas concluídas;
- metas quase concluídas;
- atalhos para criar meta/equipe e retomar meta recente.

### Segurança
Agregações devem respeitar exatamente o mesmo escopo das listagens.

---

## Fase 24 — Busca, filtros e ordenação

**Status:** CONCLUÍDA — busca e filtros escopados no backend com ordenação por recentes, nome, prazo e progresso na tela de metas.

### Metas
Busca por:
- nome;
- descrição;
- tags quando adequado.

Filtros:
- status;
- categoria;
- contexto;
- com/sem prazo;
- período.

Ordenação:
- recentes;
- nome;
- prazo;
- maior progresso;
- menor progresso;
- criação.

### Equipes
Busca por nome e ordenação simples.

### Regra
Não carregar dados sem escopo para filtrar somente no browser.

---

## Fase 25 — Lembretes

### Objetivo
Criar reminders individuais ligados a metas.

### Opções iniciais
- sem lembrete;
- no dia;
- 1 dia antes;
- 3 dias antes;
- 1 semana antes;
- data/hora personalizada se simples e segura.

### Domínio
Estrutura conceitual:
- id;
- user_id;
- goal_id;
- remind_at;
- status;
- delivered_at;
- timestamps.

### Regras
- timezone explícito;
- usuário controla apenas seus reminders;
- processamento idempotente;
- entrega interna primeiro;
- preparar push futuro sem exigir Capacitor agora.

---

## Fase 26 — Feed de atividade

### Objetivo
Dar vida e contexto à colaboração.

### Eventos
Exemplos:
- meta criada/editada;
- step criado/concluído;
- meta concluída;
- owner override;
- membro entrou/saiu;
- role alterada;
- convite aceito;
- comentário;
- reação.

### Modelagem
Evento de produto separado de log técnico:
- actor;
- event_type;
- goal/team;
- target_user opcional;
- metadata mínima;
- created_at.

### UI
Exibir no Dashboard, detalhe da meta e detalhe da equipe.

### Segurança
Usuário só recebe eventos de recursos acessíveis.

---

## Fase 27 — Comentários e reações

### Comentários
- texto simples;
- meta como alvo principal;
- limite de tamanho;
- editar/excluir pelo autor;
- owner/admin moderam apenas quando necessário.

### Reações
Conjunto pequeno:
- 👏
- ❤️
- 🎉
- 💪

Toggle idempotente e constraint contra duplicata indevida.

### Segurança
- autorização por membership;
- XSS;
- rate limit razoável;
- sem HTML arbitrário.

### Produto
Reforçar reconhecimento social sem criar chat em tempo real.

---

## Fase 28 — Templates e duplicação de metas

### Duplicar
Copiar:
- nome;
- descrição;
- categoria;
- tags;
- estrutura de steps.

Nunca copiar:
- progresso;
- members;
- invites;
- comentários;
- activity;
- completion state.

Datas devem ser revisadas antes de salvar.

### Templates oficiais
Sugestões:
- Planejar uma viagem;
- Correr 5 km;
- Reserva financeira;
- Ler livros;
- Reforma da casa;
- Planejar evento.

Templates devem ser totalmente editáveis.

---

## Fase 29 — Calendário / Timeline

### Objetivo
Dar visão temporal de:
- início;
- prazo;
- reminders;
- conclusões relevantes.

Escolher calendário mensal ou timeline/lista cronológica com prioridade para a melhor experiência mobile.

### Regras
- metas perenes continuam válidas;
- timezone consistente;
- filtros;
- não inventar datas.

---

## Fase 30 — Indicador de ritmo “Em ritmo”

### Aplicabilidade
Somente metas com:
- start date;
- end date;
- pelo menos um step.

### Cálculo
Comparar:
- percentual de tempo transcorrido;
- percentual de steps concluídos.

### Estados
- Adiantada;
- Em ritmo;
- Atenção;
- Atrasada quando aplicável.

### Regras
- fórmula e thresholds documentados;
- não persistir percentual;
- não apresentar como previsão científica;
- suportar visão individual/coletiva quando fizer sentido.

---

## Fase 31 — Onboarding

### Objetivo
Levar usuário novo ao primeiro valor rapidamente.

### Fluxo
Após autenticação:
- criar primeira meta;
- criar equipe;
- usar template;
- aceitar convite existente.

Usuário vindo por convite deve priorizar o convite.

Onboarding:
- curto;
- pulável;
- não bloqueante;
- sem gamificação persistente.

---

## Fase 32 — Perfil e preferências

### Perfil
- nome;
- avatar quando viável;
- e-mail;
- providers vinculados;
- timezone;
- preferências básicas.

### Sessões
Se suportado:
- listar;
- encerrar outras sessões.

### Regra
Não implementar exclusão definitiva/transferência de ownership sem política explícita.

Timezone deve alimentar reminders/calendário.

---

## Fase 33 — Notificações internas

### Eventos
- convite;
- aceite;
- membro entrou;
- role alterada;
- comentário/reação;
- reminder;
- prazo próximo;
- meta concluída;
- owner override.

### UI
- badge de não lidas;
- lista;
- marcar como lida;
- marcar todas;
- deep links.

### Segurança
Notificação não concede acesso. Deep link sempre revalida autorização.

---

## Fase 34 — Integração, hardening e refinamento

### Revisar fluxos
- onboarding;
- meta individual;
- meta compartilhada;
- equipe;
- convite;
- progress;
- conclusão;
- override;
- reminder;
- activity;
- comentário/reação;
- template;
- calendário.

### Revisar
Backend:
- autorização;
- N+1;
- índices;
- paginação;
- transações;
- idempotência.

Frontend:
- mobile-first;
- acessibilidade;
- loading/error/empty;
- microinterações;
- reduced motion.

Segurança:
1. isolamento;
2. autorização backend;
3. IDOR;
4. segredos;
5. XSS/input.

---

## Fase 35 — Fechamento do Plano 02

### Entregas
Atualizar:
- `AI_CONTEXT.md`;
- `IMPLEMENTATION_PLAN_02.md`;
- README;
- documentação técnica;
- known limitations;
- backlog.

Criar:
`docs/PLANO_02_FECHAMENTO.md`

Registrar:
- fases/commits;
- migrations;
- endpoints;
- telas;
- testes;
- builds;
- segurança;
- PostgreSQL real;
- Google OAuth real;
- diferenças frontend/backend restantes;
- backlog.

---

## Fora do escopo do Plano 02

Não implementar sem nova decisão:
- XP;
- níveis;
- moedas;
- streaks;
- ranking;
- billing provider;
- Capacitor;
- push nativo;
- chat em tempo real;
- feed social público;
- diário completo;
- hábitos como domínio separado;
- Kanban;
- metas recorrentes;
- subtarefas hierárquicas;
- IA gerando metas automaticamente.

## PostgreSQL

O Plano 01 deixou PostgreSQL bloqueado externamente.

Se houver ambiente/credencial durante o Plano 02:
- executar validação pendente;
- corrigir incompatibilidades;
- atualizar documentação.

Se continuar indisponível:
- manter bloqueio explícito;
- não declarar produção pronta;
- continuar desenvolvimento possível em SQLite.

## Definition of Done global

O Plano 02 termina quando:
- paridade frontend/backend estiver comprovada;
- Dashboard estiver enriquecido;
- progressão visual estiver consistente;
- busca/filtros funcionarem;
- reminders funcionarem;
- activity feed funcionar;
- comentários/reações funcionarem;
- templates/duplicação funcionarem;
- calendário/timeline funcionar;
- indicador de ritmo funcionar;
- onboarding funcionar;
- perfil/preferências funcionarem;
- notificações internas funcionarem;
- segurança estiver revisada;
- testes/lint/typecheck/builds passarem;
- documentação refletir o código real;
- `docs/PLANO_02_FECHAMENTO.md` existir;
- cada fase tiver commit coerente;
- nenhum push for feito sem solicitação explícita.
