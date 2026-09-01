# IMPLEMENTATION_PLAN_03.md — MissionLive

> Continuação do `IMPLEMENTATION_PLAN.md` e `IMPLEMENTATION_PLAN_02.md`.
>
> Numeração global preservada: este plano começa na **Fase 36**.
>
> Base obrigatória de contexto:
> - `AI_CONTEXT.md`
> - `AGENTS.md`
> - `IMPLEMENTATION_PLAN.md`
> - `IMPLEMENTATION_PLAN_02.md`
> - `GOAL_02.md`
> - estado real do repositório
>
> Estrutura aprovada e preservada:
>
> ```text
> MissionLive/
> ├── apps/
> │   ├── web/   # frontend React + TypeScript + Vite
> │   └── api/   # backend NestJS + TypeScript
> ├── docs/
> ├── scripts/
> └── ...
> ```
>
> **Não reorganizar `apps/web` e `apps/api` para `frontend/` e `backend/`.**
> A separação atual é válida e deve ser mantida.

# 1. Objetivo do Plano 03

O Plano 03 é um ciclo dedicado a **refinamento visual, consistência de UX e qualidade de apresentação** do MissionLive.

O objetivo não é adicionar novas features relevantes de produto.

O objetivo é transformar a interface atual em uma experiência:

- visualmente coerente;
- limpa;
- madura;
- mobile-first;
- bem espaçada;
- hierarquicamente clara;
- consistente entre páginas;
- acessível;
- agradável de usar;
- preparada para novas features futuras.

Os problemas que motivam este plano incluem:

- botões muito próximos de inputs;
- elementos com espaçamento insuficiente;
- textos mal posicionados dentro de boxes/cards;
- empty states pouco trabalhados;
- ações redundantes ou concorrentes;
- diferenças de padding entre páginas;
- hierarquia inconsistente entre título, subtítulo e conteúdo;
- componentes visualmente semelhantes implementados de formas diferentes;
- excesso de espaço vazio em algumas páginas;
- alinhamentos irregulares;
- ausência de uma linguagem visual suficientemente consolidada.

# 2. Princípio obrigatório — corrigir sistema, não pixels isolados

Evitar correções locais do tipo:

```css
margin-top: 17px;
padding-left: 13px;
```

quando o problema puder ser resolvido por regra de design reutilizável.

Antes de ajustar páginas individualmente, consolidar:

- spacing scale;
- page gutters;
- section gaps;
- card padding;
- form spacing;
- button/input height;
- border radius;
- typography hierarchy;
- max-width;
- grid behavior;
- breakpoints;
- semantic color tokens.

A prioridade é criar um **sistema visual coerente** e depois aplicar esse sistema às páginas.

# 3. Identidade visual aprovada

## Paleta base

```css
--primary: #09456c;

--neutral-strong: #6c788e;
--neutral-medium: #a6aec1;
--neutral-light: #cfd5e1;
--surface: #ededf2;
--background: #fcfdff;

--text-primary: #172033;
```

## Uso esperado

### `#09456c`
Usar como:
- ação primária;
- item ativo;
- links importantes;
- progresso;
- checkbox concluído;
- ícones principais;
- destaques selecionados.

Evitar preencher grandes áreas desnecessariamente.

### `#6c788e`
Usar como:
- texto secundário;
- ícones secundários;
- elementos de apoio.

### `#a6aec1`
Usar como:
- muted;
- disabled;
- detalhe visual de baixa importância.

Não usar em textos importantes pequenos sem verificar contraste.

### `#cfd5e1`
Usar como:
- border;
- divider;
- surface boundary.

### `#ededf2`
Usar como:
- superfície secundária;
- agrupamentos;
- background alternativo discreto.

### `#fcfdff`
Usar como:
- background principal;
- base de superfícies claras.

### `#172033`
Usar como:
- texto principal;
- títulos;
- conteúdo de leitura.

## Cores semânticas

Definir durante o Design System:
- success;
- warning;
- danger;
- info.

Requisitos:
- contraste adequado;
- consistência;
- não depender apenas de cor;
- não conflitar com `--primary`.

# 4. Progressão e sentimento de recompensa

O MissionLive deve continuar reforçando sensação de avanço sem virar sistema de gamificação.

Usar:
- barras;
- anéis quando fizer sentido;
- percentuais;
- `X de Y`;
- estado “quase lá”;
- “em ritmo”;
- progresso coletivo;
- feedback ao concluir step;
- celebração discreta ao concluir meta;
- microinterações;
- reações;
- atividade recente.

Não implementar:
- XP;
- nível;
- moedas;
- ranking;
- streak funcional;
- loja;
- badges colecionáveis.

# 5. Regra de conclusão visual

Uma tela não é considerada pronta apenas porque:
- renderiza;
- não quebra;
- passa nos testes;
- build termina.

Também deve passar por revisão visual de:
- alinhamento;
- spacing;
- hierarchy;
- padding;
- estados vazios;
- loading;
- erro;
- hover/focus/pressed;
- responsividade;
- touch targets;
- overflow;
- consistência de componentes.

---

# Fase 36 — Auditoria visual completa

**Status:** CONCLUÍDA — auditoria visual completa registrada em `docs/design/visual-audit-plan03.md`; commit `8bd9ee4`.

## Objetivo

Mapear sistematicamente os problemas visuais e de UX do frontend atual antes de começar a refatoração.

## Escopo

Inspecionar todas as rotas e estados disponíveis no `apps/web`.

Cobrir:

- Início;
- Metas;
- detalhe de meta;
- criação de meta;
- edição de meta;
- Equipes;
- detalhe de equipe;
- criação de equipe;
- Modelos/Templates;
- Calendário;
- Avisos/Notificações;
- Perfil;
- Login;
- Cadastro;
- recuperação de senha;
- convite;
- onboarding;
- modais;
- menus;
- filtros;
- comentários;
- activity feed;
- reminders;
- estados vazios;
- loading;
- error;
- forbidden/unauthorized quando houver.

## Checklist de auditoria

Verificar em cada tela:
- título;
- subtítulo;
- CTA principal;
- ações secundárias;
- alinhamento horizontal;
- alinhamento vertical;
- padding;
- gap;
- comprimento de linha;
- largura máxima;
- grids;
- cards;
- boxes;
- inputs;
- labels;
- helper text;
- mensagens de erro;
- botões;
- icon buttons;
- empty states;
- estados disabled;
- responsividade;
- overflow;
- hierarquia;
- contraste;
- acessibilidade.

## Entrega

Criar:

`docs/design/visual-audit-plan03.md`

Para cada problema:
- página;
- componente;
- descrição;
- severidade visual:
  - crítica;
  - alta;
  - média;
  - baixa;
- causa provável;
- componente/token que deve resolver;
- fase responsável.

## Regra

Não fazer grande refatoração nesta fase.
Corrigir apenas problemas que impeçam a própria auditoria.

## Definition of Done

- todas as páginas auditadas;
- screenshots/notas quando viável;
- backlog visual completo;
- commit da fase.

---

# Fase 37 — Design System, tokens e fundamentos

**Status:** CONCLUÍDA — tokens visuais centralizados e fundamentos documentados em `docs/design/DESIGN_SYSTEM.md`.

## Objetivo

Criar a base compartilhada para todos os refinamentos posteriores.

## Tokens obrigatórios

### Cores
Criar semantic tokens:

```text
background
surface
surface-subtle
surface-emphasis
border
border-strong

text-primary
text-secondary
text-muted
text-inverse

primary
primary-hover
primary-active
primary-subtle

success
success-subtle
warning
warning-subtle
danger
danger-subtle
info
info-subtle
```

### Espaçamento

Criar escala consistente, por exemplo:

```text
space-1
space-2
space-3
space-4
space-5
space-6
space-8
space-10
space-12
```

Não obrigar exatamente esses números se a base atual exigir adaptação, mas manter escala coerente.

### Layout
Definir:

```text
page-padding-mobile
page-padding-tablet
page-padding-desktop
page-max-width

section-gap-sm
section-gap-md
section-gap-lg

card-padding-sm
card-padding-md
card-padding-lg

form-gap
field-gap
action-gap
```

### Controles
Definir:
- input heights;
- button heights;
- icon button size;
- textarea min-height;
- radius;
- border width;
- focus ring;
- disabled opacity.

### Tipografia
Definir:
- display/title;
- page title;
- section title;
- card title;
- body;
- body small;
- label;
- helper;
- caption.

## Documentação

Criar:
`docs/design/DESIGN_SYSTEM.md`

## Definition of Done

- tokens aplicáveis;
- nenhuma cor principal hardcoded em novos componentes;
- documentação;
- commit da fase.

---

# Fase 38 — Componentes visuais base

**Status:** CONCLUÍDA — primitives compartilhadas implementadas em `apps/web/src/design-system.tsx` e aplicadas aos estados e ações comuns.

## Objetivo

Padronizar primitives visuais antes de corrigir páginas.

## Componentes prioritários

Revisar/criar:
- `Button`;
- `IconButton`;
- `Input`;
- `Textarea`;
- `Select`;
- `Checkbox`;
- `FormField`;
- `Card`;
- `Panel`;
- `Section`;
- `PageHeader`;
- `PageContainer`;
- `EmptyState`;
- `StatusChip`;
- `ContextBadge`;
- `ProgressBar`;
- `ProgressRing` quando justificável;
- `Modal/Dialog`;
- `DropdownMenu`;
- `Tabs`;
- `Toolbar`;
- `FilterBar`;
- `FeedbackBanner`;
- `Skeleton`;
- `Spinner` quando necessário.

## Requisitos

- tamanhos consistentes;
- spacing interno;
- focus states;
- disabled;
- loading;
- mobile touch targets;
- visual alinhado à nova paleta.

## Definition of Done

- páginas futuras deixam de repetir soluções locais;
- primitives documentadas;
- commit da fase.

---

# Fase 39 — Navegação e estrutura global das páginas

**Status:** CONCLUÍDA — shell, navegação mobile/desktop, espaçamento de página, largura de conteúdo e acesso ao perfil revisados.

## Objetivo

Padronizar shell, headers e composição de página.

## Estrutura recomendada

```text
Page
├── PageHeader
│   ├── eyebrow opcional
│   ├── title
│   ├── description
│   └── primary action
│
├── Toolbar/Filters opcional
│
└── Content
    ├── sections
    ├── cards
    └── empty state quando aplicável
```

## Revisar
- sidebar;
- mobile navigation;
- top bar;
- active state;
- page title spacing;
- largura de conteúdo;
- alinhamento entre páginas;
- CTA position;
- sticky elements quando houver.

## Regra
Uma mesma posição funcional deve usar a mesma lógica de layout em todas as páginas.

## Definition of Done
- shell consistente;
- mobile/desktop coerentes;
- commit da fase.

---

# Fase 40 — Formulários, inputs, botões e ações

**Status:** CONCLUÍDA — controles, alturas, foco, hierarquia de ações e empilhamento responsivo revisados com tokens compartilhados.

## Objetivo

Corrigir os problemas mais perceptíveis de spacing e composição de controles.

## Revisar todos os formulários

Especialmente:
- login;
- cadastro;
- recuperação;
- meta;
- equipe;
- perfil;
- reminders;
- comentários;
- filtros.

## Problemas a eliminar

- input colado em botão;
- botão sem espaço lateral;
- labels desalinhados;
- helper text sem respiro;
- campos com larguras inconsistentes;
- botões com alturas diferentes;
- ações primária/secundária indistinguíveis;
- formulários horizontais excessivamente comprimidos;
- CTA duplicado na mesma área.

## Regras de UX

- uma ação principal clara por contexto;
- secondary actions não competem visualmente;
- destructive actions distinguíveis;
- formulários complexos devem quebrar em seções;
- mobile empilha controles quando necessário.

## Definition of Done
- todos os formulários auditados;
- problemas como os vistos nos prints eliminados;
- commit da fase.

---

# Fase 41 — Cards, boxes e empty states

**Status:** CONCLUÍDA — painéis, cards, estados vazios e duplicidade de CTA revisados nas superfícies principais.

## Objetivo

Corrigir desalinhamentos de texto e tornar estados vazios intencionais.

## Cards/Boxes

Padronizar:
- padding;
- title gap;
- body gap;
- footer/actions;
- border;
- radius;
- background;
- hover quando interativo.

## Empty State

Criar estrutura consistente:

```text
Icon/Illustration opcional
Title
Description
Primary CTA opcional
Secondary CTA opcional
```

## Regras

- texto não deve ficar encostado na borda;
- evitar boxes horizontais gigantes para mensagens curtas;
- CTA deve ter função clara;
- evitar duplicar mesma ação no header e empty state sem necessidade.

## Aplicar especialmente
- Equipes;
- Calendário;
- Modelos;
- Avisos;
- Metas vazias;
- Dashboard sem dados.

## Definition of Done
- empty states consistentes;
- boxes alinhadas;
- commit da fase.

---

# Fase 42 — Refinamento do Dashboard

**Status:** CONCLUÍDA — indicadores, progresso, distribuição, timeline, atividade e listas receberam a fundação visual comum.

## Objetivo

Melhorar o Dashboard V2 sem alterar regras de negócio.

## Revisar

- cards principais;
- hierarquia dos indicadores;
- progress bars;
- charts;
- activity;
- próximos prazos;
- atrasadas;
- categorias;
- contexto;
- atalhos.

## UX

O Dashboard deve responder rapidamente:
- o que avancei;
- o que falta;
- o que vence em breve;
- o que está atrasado;
- o que está quase concluído.

## Layout

Mobile:
- leitura vertical clara;
- cards prioritários primeiro;
- gráficos sem overflow.

Desktop:
- grid equilibrado;
- evitar grandes vazios;
- manter largura legível.

## Definition of Done
- visual consistente;
- progressão perceptível;
- commit da fase.

---

# Fase 43 — Refinamento de Metas

**Status:** CONCLUÍDA — listagem, filtros, cards, detalhe, progresso, passos, colaboração e ações foram alinhados aos tokens.

## Objetivo

Melhorar toda a experiência visual de metas.

## Cobrir

- listagem;
- busca/filtros;
- cards;
- criação;
- edição;
- detalhe;
- steps;
- progresso;
- participantes;
- comentários;
- reactions;
- activity;
- reminders;
- owner override.

## Metas em cards

Mostrar de forma equilibrada:
- nome;
- categoria;
- contexto;
- prazo;
- progress;
- status.

Evitar excesso de informação.

## Detalhe

Criar hierarquia clara:
1. header;
2. progresso;
3. checklist;
4. participantes quando aplicável;
5. atividade/comentários;
6. ações secundárias.

## Definition of Done
- experiência visual coerente;
- mobile-first;
- commit da fase.

---

# Fase 44 — Refinamento de Equipes

**Status:** CONCLUÍDA — CTA duplicado removido; lista, vazio, detalhe, membros e ações receberam composição consistente.

## Objetivo

Corrigir estrutura visual e reduzir ações concorrentes.

## Página de listagem

Evitar múltiplas formas simultâneas de "Criar equipe".

Preferir:
- CTA principal no header;
- empty state com CTA apenas quando não houver equipes;
- não manter formulário inline comprimido se o fluxo principal já existe.

## Detalhe

Hierarquia:
1. equipe;
2. membros;
3. progresso coletivo;
4. metas;
5. activity;
6. ações administrativas.

## Membros

Padronizar:
- avatar;
- nome;
- role;
- progresso;
- menu de ações.

## Definition of Done
- problema de ações duplicadas eliminado;
- layout consistente;
- commit da fase.

---

# Fase 45 — Refinamento de Modelos, Calendário e Avisos

**Status:** CONCLUÍDA — empty state de modelos, navegação de período do calendário e badge de não lidos foram adicionados.

## Modelos/Templates

Melhorar:
- cards;
- descrição;
- CTA;
- filtros;
- estado vazio.

## Calendário

A página deve parecer uma ferramenta temporal real mesmo sem eventos.

Revisar:
- header;
- período;
- navegação anterior/próximo;
- hoje;
- filtros;
- lista/timeline/calendário;
- empty state;
- CTA para criar meta quando fizer sentido.

Evitar caixa vazia horizontal com texto desalinhado.

## Avisos/Notificações

Revisar:
- badge;
- unread/read;
- agrupamento;
- deep links;
- empty state.

## Definition of Done
- páginas secundárias com o mesmo nível de acabamento das principais;
- commit da fase.

---

# Fase 46 — Responsividade mobile, tablet e desktop

**Status:** CONCLUÍDA — larguras 360, 768 e 1280 foram verificadas sem overflow horizontal; regras mobile-first foram consolidadas.

## Objetivo

Validar visualmente a aplicação inteira em múltiplas larguras.

## Viewports mínimos

Testar:
- mobile estreito;
- mobile comum;
- tablet portrait;
- tablet landscape quando relevante;
- desktop comum;
- desktop amplo.

## Verificar

- overflow horizontal;
- grid;
- truncamento;
- wrapping;
- button groups;
- forms;
- tables/listas;
- charts;
- navigation;
- modals;
- dropdowns;
- long text;
- empty states.

## Regra

Mobile-first significa projetar a composição para mobile, não apenas fazer desktop encolher.

## Definition of Done
- nenhuma rota relevante quebra;
- screenshots/registro de QA quando viável;
- commit da fase.

---

# Fase 47 — Acessibilidade e microinterações

**Status:** CONCLUÍDA — foco visível, labels/roles semânticos, touch targets, estados semânticos e reduced motion foram revisados.

## Acessibilidade

Revisar:
- keyboard;
- focus;
- aria labels;
- labels;
- contraste;
- status não dependente só de cor;
- touch target;
- semantic HTML;
- feedback de erro.

## Motion

Adicionar/refinar:
- hover;
- focus;
- pressed;
- checkbox complete;
- progress update;
- celebration discreet;
- modal transitions.

Respeitar:
`prefers-reduced-motion`.

## Regra

Microinteração deve informar ou recompensar.
Não adicionar movimento decorativo excessivo.

## Definition of Done
- interação madura;
- sem regressões de acessibilidade;
- commit da fase.

---

# Fase 48 — Aplicação completa da nova paleta

**Status:** CONCLUÍDA — paleta aprovada aplicada; não restam hex literais fora da definição central de tokens.

## Objetivo

Aplicar a identidade visual aprovada em todas as superfícies.

## Paleta aprovada

```css
--primary: #09456c;
--neutral-strong: #6c788e;
--neutral-medium: #a6aec1;
--neutral-light: #cfd5e1;
--surface: #ededf2;
--background: #fcfdff;
--text-primary: #172033;
```

## Regras

- usar semantic tokens;
- não espalhar hex em componentes;
- validar contraste;
- revisar dark mode apenas se ele já existir;
- não criar dark mode novo neste plano se não estiver implementado.

## Estados semânticos

Definir e aplicar:
- success;
- warning;
- danger;
- info.

## Revisar especialmente

- sidebar/nav;
- buttons;
- selected state;
- progress;
- links;
- charts;
- empty states;
- cards;
- focus ring;
- status badges.

## Definition of Done
- identidade consistente;
- contraste validado;
- hardcodes minimizados;
- commit da fase.

---

# Fase 49 — QA visual completo e regressão

**Status:** CONCLUÍDA — evidências técnicas e responsivas registradas em `docs/design/visual-qa-plan03.md`.

## Objetivo

Revisar todo o frontend depois da refatoração.

## Processo

Navegar por todas as rotas e testar:
- empty;
- populated;
- loading;
- error;
- unauthorized;
- long text;
- many cards;
- few cards;
- mobile;
- tablet;
- desktop.

## Verificar

- spacing;
- alignment;
- overflow;
- duplicate CTA;
- border/radius;
- text wrapping;
- charts;
- form errors;
- menu position;
- modal sizing;
- focus;
- color;
- contrast;
- animations.

## Testes técnicos

Executar:
- frontend tests;
- backend tests relevantes;
- lint;
- typecheck;
- build;
- smoke test.

## Entrega

Criar:
`docs/design/visual-qa-plan03.md`

## Definition of Done
- regressões corrigidas;
- evidências registradas;
- commit da fase.

---

# Fase 50 — Fechamento do Plano 03

**Status:** CONCLUÍDA — contexto, plano, Design System e fechamento documental atualizados.

## Objetivo

Consolidar o novo sistema visual e o estado real do projeto.

## Atualizar

- `AI_CONTEXT.md`;
- `IMPLEMENTATION_PLAN_03.md`;
- README quando necessário;
- `docs/design/DESIGN_SYSTEM.md`;
- documentação de componentes;
- known limitations.

## Criar

`docs/PLANO_03_FECHAMENTO.md`

## Registrar

- fases;
- commits;
- componentes criados/refatorados;
- tokens;
- paleta;
- páginas revisadas;
- responsividade;
- acessibilidade;
- testes;
- builds;
- limitações restantes;
- backlog visual;
- estado do Git.

## Definition of Done
- documentação representa o código real;
- F36–F50 concluídas ou bloqueadas externamente com justificativa;
- árvore Git consistente;
- commit de fechamento;
- nenhum push sem solicitação explícita.

---

# 6. Fora do escopo do Plano 03

Não implementar novas features de produto apenas por oportunidade encontrada durante o refinamento.

Fora do escopo:
- novos módulos funcionais;
- billing;
- Capacitor;
- push nativo;
- XP;
- gamificação;
- chat;
- novos tipos de metas;
- IA;
- feed público;
- alterações relevantes de schema sem necessidade visual real.

Se um problema visual depender de mudança funcional:
- documentar;
- fazer a menor alteração necessária;
- não expandir escopo silenciosamente.

# 7. Definition of Done global

O Plano 03 estará concluído quando:

- auditoria visual estiver completa;
- Design System estiver documentado;
- tokens estiverem centralizados;
- componentes base estiverem padronizados;
- navegação estiver consistente;
- formulários estiverem bem espaçados;
- botões e ações tiverem hierarquia clara;
- cards/boxes estiverem alinhados;
- empty states estiverem refinados;
- Dashboard estiver refinado;
- Metas estiverem refinadas;
- Equipes estiverem refinadas;
- Modelos/Calendário/Avisos estiverem refinados;
- mobile/tablet/desktop estiverem validados;
- acessibilidade tiver sido revisada;
- microinterações estiverem consistentes;
- nova paleta estiver aplicada;
- QA visual final estiver concluído;
- testes/lint/typecheck/builds passarem;
- documentação refletir o estado real;
- cada fase tiver commit próprio;
- nenhum push tiver sido feito sem solicitação explícita.
