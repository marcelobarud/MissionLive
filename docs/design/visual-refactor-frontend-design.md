# Refatoração visual — frontend-design

Data: 2026-09-01

## Escopo

Refinamento visual do frontend React/Vite em `apps/web/src`, sem alteração de APIs, contratos, autenticação, autorização, regras de metas, dados ou rotas.

## Inventário coberto

As rotas reais foram confirmadas em `apps/web/src/app.tsx`:

| Área | Rotas e estados | Componentes compartilhados envolvidos |
| --- | --- | --- |
| Acesso | login, cadastro, verificação, recuperação, redefinição e Google | `AuthScreen`, campos, botões e mensagens |
| Início | dashboard preenchido, vazio, loading, erro e atividade | `PageHeading`, `StatCard`, `ProgressBar`, painéis e listas |
| Metas | lista, filtros, criação, edição, detalhe, steps, progresso, comentários e reminders | cards, badges, formulários, painéis, estados e ações |
| Equipes | lista, criação, detalhe, membros, roles e convite | cards, formulários, lista de membros e ações destrutivas |
| Modelos | lista, uso e vazio | cards e `EmptyState` |
| Calendário | período, navegação, eventos, vazio, loading e erro | toolbar, links de evento e painéis |
| Avisos | unread/read, deep link, vazio e erro | navegação, badge e `NotificationRow` |
| Perfil | preferências, avatar e sessões | formulários, avatar, confirmação e toast |
| Convites/onboarding | preview, aceite, erro, prompt e estados de ação | convite, onboarding, botões e feedback |

## Direção consolidada

**Movimento editorial**: o azul-marinho profundo (`--ink-deep`) funciona como âncora do shell e das ações primárias; o workspace claro, com bordas discretas, mantém a interface profissional e acolhedora. O progresso continua sendo o sinal visual principal, acompanhado de texto para não depender de cor.

Decisões intencionais:

- sidebar escura e estável para separar navegação de conteúdo;
- tipografia de sistema com títulos maiores, curtos e de tracking negativo;
- uma única família de superfícies, com variação de contraste por contexto e não por excesso de cards;
- cartões de metas com marcador superior de progresso e hover discreto;
- painel de destaque escuro usado apenas no dashboard, como assinatura visual;
- fundo de autenticação escuro com moldura fina e card claro para marcar a entrada no produto;
- controles com altura, foco, raio e estados compartilhados;
- motion curta, funcional e removível com `prefers-reduced-motion`.

## Preservação funcional

As alterações ficaram limitadas a tokens, composição CSS e documentação visual. Nenhum endpoint, chamada de API, rota, regra de autorização, biblioteca de ícones ou fluxo de negócio foi alterado.

## Validação

- `npm run typecheck --workspace @missionlive/web`
- `npm run lint --workspace @missionlive/web`
- `npm run test --workspace @missionlive/web` — 3 suítes, 10 testes
- `npm run build --workspace @missionlive/web`
- inspeção visual no navegador em `http://localhost:5173/` com viewport desktop; autenticação carregada com a nova composição.

## Auditoria web-design-guidelines

As guidelines atuais foram buscadas em 2026-09-01 e aplicadas ao conjunto de arquivos reais do frontend. Achados aplicáveis corrigidos:

- skip link com foco visível e destino `main-content`;
- `autocomplete`, `name` e `spellCheck` coerentes nos campos de autenticação, formulários e prompts;
- placeholders com exemplos e reticências;
- dimensões explícitas nos avatares `<img>` para reduzir risco de layout shift;
- `theme-color` compatível com o shell;
- `touch-action: manipulation`, tap highlight intencional e contenção de overscroll em overlays;
- headings com `text-wrap: balance` e contagens com numerais tabulares;
- transições com propriedades explícitas e variante para reduced motion.

Não foram alteradas regras de negócio, contratos, permissões ou o uso de links/botões semântico já presente. A auditoria não adicionou dependências.

## Auditoria final de cobertura

- [x] `/` — dashboard e estados de loading/erro/vazio
- [x] `/activities` — histórico e paginação
- [x] `/goals` — listagem, filtros e estado vazio
- [x] `/goals/new` — formulário de criação
- [x] `/goals/:goalId` — detalhe, checklist, progresso, comentários, reminders e ações
- [x] `/teams` — listagem e estado vazio
- [x] `/teams/new` — criação de equipe e primeira meta
- [x] `/teams/:teamId` — detalhe, membros, roles, convites e metas
- [x] `/templates` — modelos, uso e estado vazio
- [x] `/calendar` — período, navegação, eventos e estado vazio
- [x] `/notifications` — avisos lidos/não lidos, deep link e estado vazio
- [x] `/profile` — avatar, preferências e sessões
- [x] `/invite/:token` — preview, aceite e erro
- [x] rotas de autenticação e recuperação — login, cadastro, verificação, recuperação e redefinição
- [x] componentes compartilhados — shell, navegação, botões, campos, cards, painéis, badges, progresso, dialogs, toasts, skeleton/loading, erro e vazio
- [x] dimensões mobile, tablet e desktop consideradas por CSS e inspeção visual desktop
- [x] teclado, foco, labels, semântica, touch, reduced motion e overflow considerados
- [x] nenhuma funcionalidade removida e nenhum contrato frontend/backend alterado
