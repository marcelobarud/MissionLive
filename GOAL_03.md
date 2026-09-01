# GOAL_03.md — MissionLive Plano 03

## Missão

Executar integralmente o `IMPLEMENTATION_PLAN_03.md`, da **Fase 36 à Fase 50**, refinando o MissionLive visualmente e consolidando um Design System consistente.

Este GOAL é dedicado principalmente a:

- spacing;
- alignment;
- hierarchy;
- typography;
- layout;
- forms;
- buttons;
- cards;
- boxes;
- empty states;
- responsividade;
- acessibilidade;
- microinterações;
- nova paleta;
- QA visual.

Não transformar este ciclo em desenvolvimento de novas features de produto.

## 1. Ordem obrigatória de leitura

Antes de editar:

1. `AI_CONTEXT.md`
2. `AGENTS.md`
3. `IMPLEMENTATION_PLAN.md`
4. `IMPLEMENTATION_PLAN_02.md`
5. `GOAL_02.md`
6. `IMPLEMENTATION_PLAN_03.md`
7. `GOAL_03.md`
8. estado real do repositório
9. branch, working tree e commits recentes

O código real é a evidência final.

## 2. Estrutura do projeto

Manter:

```text
MissionLive/
└── apps/
    ├── web/
    └── api/
```

Não renomear para `frontend/` e `backend/`.

`apps/web` é o frontend.
`apps/api` é o backend.

A estrutura atual é aprovada.

## 3. Sequência obrigatória

Executar:

- F36 Auditoria visual
- F37 Design System/tokens
- F38 Componentes base
- F39 Navegação/page structure
- F40 Formulários/botões/ações
- F41 Cards/boxes/empty states
- F42 Dashboard
- F43 Metas
- F44 Equipes
- F45 Modelos/Calendário/Avisos
- F46 Responsividade
- F47 Acessibilidade/microinterações
- F48 Nova paleta
- F49 QA visual/regressão
- F50 Fechamento

Não pular diretamente para correções locais de página antes de consolidar os fundamentos.

## 4. Regra crítica — não fazer pixel fixing isolado

Evitar:
- margins arbitrárias;
- padding específico repetido;
- hex hardcoded;
- alturas diferentes para controles equivalentes;
- CSS duplicado por página.

Preferir:
- token;
- primitive;
- shared component;
- shared layout.

Se o mesmo problema aparece em mais de uma tela, resolver na camada compartilhada.

## 5. Problemas que devem ser procurados sistematicamente

Em todas as páginas verificar:

- botão colado em input;
- texto encostado em box;
- alinhamento irregular;
- spacing desigual;
- headings sem hierarquia;
- CTA duplicado;
- ações concorrentes;
- formulário excessivamente horizontal;
- label desalinhada;
- empty state pobre;
- conteúdo muito largo;
- excesso de espaço vazio;
- card com padding inconsistente;
- botão com altura diferente;
- mobile overflow;
- desktop vazio;
- modal pequeno/grande demais;
- dropdown fora da tela;
- gráfico espremido;
- texto longo quebrando layout.

Não limitar a correção aos exemplos já conhecidos.

## 6. Identidade visual aprovada

Usar semantic tokens baseados em:

```css
--primary: #09456c;

--neutral-strong: #6c788e;
--neutral-medium: #a6aec1;
--neutral-light: #cfd5e1;
--surface: #ededf2;
--background: #fcfdff;

--text-primary: #172033;
```

Definir semantic colors adicionais:
- success;
- warning;
- danger;
- info.

Não usar `#6c788e` como texto pequeno principal sem verificar contraste.

Não usar `#a6aec1` para informação crítica.

## 7. Progressão e recompensa

Manter sensação de avanço com:

- ProgressBar;
- ProgressRing quando útil;
- percentual;
- X de Y;
- quase lá;
- em ritmo;
- avanço coletivo;
- feedback de step;
- completion feedback;
- celebration discreet;
- activity;
- reactions.

Não implementar:
- XP;
- levels;
- coins;
- rankings;
- streak funcional;
- shop.

## 8. Page structure padrão

Sempre que aplicável:

```text
Page
├── PageHeader
│   ├── title
│   ├── description
│   └── primary action
├── Toolbar opcional
└── Content
```

Empty state deve ser conteúdo intencional, não apenas texto jogado dentro de uma borda.

## 9. Ações

Por contexto:
- uma primary action clara;
- secondary actions menos dominantes;
- destructive actions visualmente distintas;
- evitar 2 ou 3 caminhos concorrentes para mesma ação na mesma área.

Exemplo conhecido:
na página Equipes, evitar manter simultaneamente header CTA + formulário inline + CTA de empty state quando isso gerar redundância.

## 10. Forms

Todos os forms devem:
- usar FormField/shared primitives;
- labels alinhadas;
- helper text consistente;
- errors previsíveis;
- spacing vertical padrão;
- action row separada do último campo;
- stack mobile;
- touch targets adequados.

## 11. Empty states

Devem usar:

```text
Icon opcional
Title
Description
Primary CTA opcional
Secondary CTA opcional
```

Evitar caixas largas com uma única linha de texto desalinhada.

Aplicar especialmente em:
- Equipes;
- Calendário;
- Modelos;
- Avisos;
- Metas;
- Dashboard sem dados.

## 12. Calendário

O Calendário deve manter estrutura mesmo vazio:
- período atual;
- navegação;
- hoje;
- filtros quando aplicável;
- content area;
- empty state apropriado.

Não aceitar uma página que pareça apenas uma mensagem dentro de uma box.

## 13. Mobile-first

Validar no mínimo:
- mobile estreito;
- mobile padrão;
- tablet;
- desktop.

Mobile não deve ser apenas desktop comprimido.

## 14. Acessibilidade

Obrigatório:
- focus visível;
- labels;
- keyboard;
- semantic HTML;
- contraste;
- status não dependente só de cor;
- touch targets;
- `prefers-reduced-motion`.

## 15. Visual QA

Não confiar apenas em:
- unit tests;
- build;
- lint.

Depois de cada grupo relevante de mudanças, quando houver ferramenta/browser disponível:
- abrir páginas;
- verificar visualmente;
- testar estados reais.

A F49 deve revisar sistematicamente todas as rotas relevantes.

## 16. Segurança

Não enfraquecer:
- guards;
- role checks;
- IDOR protections;
- input validation;
- XSS protections;
- secrets handling.

Mudança visual não justifica mover autorização para frontend.

## 17. Backend

O backend não deve ser refatorado sem necessidade real para este plano.

Alterações em `apps/api` devem ser mínimas e justificadas por:
- suporte visual real;
- bug;
- contrato necessário.

Não aproveitar este ciclo para redesenhar domínio.

## 18. Commits

Ao final de cada fase:

1. revisar diff;
2. rodar testes;
3. lint;
4. typecheck;
5. build;
6. atualizar docs;
7. criar commit:

`Fase N — <descrição curta>`

Não fazer push sem solicitação explícita.

Não agrupar múltiplas fases em um único commit se puder evitar.

## 19. Status

Adicionar/manter em `IMPLEMENTATION_PLAN_03.md` uma tabela:

- PENDENTE
- EM ANDAMENTO
- CONCLUÍDA
- BLOQUEADA EXTERNAMENTE

Só marcar concluída com evidência.

## 20. Fase 36

A auditoria visual deve vir antes da refatoração.

Criar:
`docs/design/visual-audit-plan03.md`

Registrar todos os problemas, não apenas os já reportados.

## 21. Fase 37

Criar:
`docs/design/DESIGN_SYSTEM.md`

Documentar:
- colors;
- spacing;
- typography;
- controls;
- radius;
- layout;
- breakpoints;
- component rules.

## 22. Fase 49

Criar:
`docs/design/visual-qa-plan03.md`

Registrar:
- páginas;
- viewports;
- estados;
- problemas;
- correções;
- pendências.

## 23. Fase 50

Criar:
`docs/PLANO_03_FECHAMENTO.md`

Registrar:
1. fases;
2. commits;
3. tokens;
4. design system;
5. components;
6. pages;
7. palette;
8. responsive QA;
9. accessibility;
10. tests;
11. lint;
12. typecheck;
13. builds;
14. limitations;
15. backlog;
16. Git state.

## 24. Critério final

O GOAL 03 só pode ser declarado concluído se:

- F36–F50 estiverem concluídas ou justificadamente bloqueadas;
- Design System existir;
- tokens estiverem centralizados;
- páginas relevantes estiverem visualmente revisadas;
- problemas de spacing/alignment tiverem sido corrigidos;
- ações duplicadas/concorrentes tiverem sido revisadas;
- nova paleta estiver aplicada;
- responsividade estiver validada;
- acessibilidade estiver revisada;
- QA visual estiver documentado;
- testes passarem;
- lint/typecheck/build passarem;
- docs refletirem o código;
- `docs/PLANO_03_FECHAMENTO.md` existir;
- nenhum push tiver sido realizado sem solicitação explícita.

Não declarar sucesso apenas porque o frontend compila.
