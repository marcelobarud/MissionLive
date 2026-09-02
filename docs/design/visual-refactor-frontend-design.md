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

Próxima etapa obrigatória: auditar esta implementação completa com `web-design-guidelines` e corrigir somente achados aplicáveis.
