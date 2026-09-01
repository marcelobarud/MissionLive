# Auditoria visual — Plano 03

Data da auditoria: 2026-09-01

## Método e evidências

A auditoria combinou inspeção do DOM e screenshot do frontend em execução (`http://localhost:5173/`) com leitura dos componentes e estilos reais em `apps/web/src/app.tsx` e `apps/web/src/styles.css`. O login foi observado visualmente em viewport 1280×720. As rotas autenticadas foram auditadas estruturalmente a partir da composição real de componentes, rotas, estados e classes; não foram inseridas credenciais no navegador.

## Inventário de rotas e estados

| Área | Rotas/estados cobertos | Resultado inicial |
|---|---|---|
| Auth | login, cadastro, verificação, recuperação, redefinição, Google | funcional, mas com escala tipográfica/paleta antigas e ações sem primitive compartilhada |
| Início | dashboard preenchido, vazio, loading, erro, activity | estrutura correta, densidade e hierarquia precisam de tokens/layout comum |
| Metas | lista, busca/filtros, vazio, criação, edição, detalhe, progresso, steps, comentários, reminders, override | funcional, porém muitos controles e painéis repetem padding e cores locais |
| Equipes | lista vazia/preenchida, criação, detalhe, membros, ações administrativas | CTA/formulário concorrentes e composição horizontal excessiva |
| Modelos | lista oficial/própria, uso, vazio potencial | sem estado vazio intencional e sem toolbar/padrão de cards compartilhado |
| Calendário | timeline com eventos, vazio, loading/erro | ainda parece lista simples; faltam período/hoje/navegação e empty state temporal |
| Avisos | lista, unread/read, vazio, deep link | visual de lista básico; falta badge visível e agrupamento/padrão de aviso |
| Perfil | formulário, sessões | usa controles locais e não há PageHeader/Section comum |
| Convite | preview, aceite, erro/expirado | CTA secundária com peso próximo da primária |
| Onboarding | prompt inicial, pular, links para meta/modelo, convite priorizado | prompt é funcional, mas não tem diálogo/card responsivo padronizado |
| Transversal | focus, hover, disabled, erros, textos longos, mobile | foco existe, mas tokens, alturas, wrapping e reduced motion ainda precisam consolidação |

## Backlog visual priorizado

| ID | Página/componente | Problema observado | Severidade | Causa provável | Resolver com | Fase |
|---|---|---|---|---|---|---|
| V03-01 | Todas / `styles.css` | Paleta atual é majoritariamente roxa e há dezenas de hex hardcoded, divergindo da identidade aprovada azul-marinho/neutra. | alta | tokens ausentes e regras históricas locais | semantic color tokens | 37, 48 |
| V03-02 | Todas | Spacing, radius, borders e alturas de controles são declarados por página/classe, sem escala comum. | alta | ausência de primitives | spacing/control tokens | 37–38 |
| V03-03 | Todas | `PageHeading`, `Panel`, `EmptyState` e formulários existem como soluções locais ou markup repetido, não como primitives reutilizáveis. | alta | `app.tsx` monolítico | componentes base | 38–39 |
| V03-04 | Shell | Desktop usa topbar com cinco/seis itens; a barra pode ficar comprimida e não há padrão claro para navegação secundária/perfil/avisos. | média | navegação cresceu por adição | shell/nav tokens e agrupamento | 39 |
| V03-05 | Login/Auth | Card fica concentrado à esquerda em desktop, deixando grande vazio; espaçamento vertical é amplo e links de ação competem entre si. | média | card sem composição desktop | PageContainer/Auth layout | 39–40 |
| V03-06 | Dashboard | Quatro stat cards + dois destaques + seis painéis criam ritmo visual irregular e podem gerar desktop muito alto/vazio. | média | grid sem hierarquia responsiva | dashboard sections/grid | 42 |
| V03-07 | Dashboard | Activity é renderizada como painel adicional abaixo de todo o dashboard, sem diferenciação de prioridade. | média | composição linear | Section/priority layout | 42 |
| V03-08 | Metas/filtros | Filter bar usa grid próprio, labels e controls sem `FormField`; seis filtros podem ficar densos em tablet. | alta | controles locais | Toolbar/FilterBar | 40, 43, 46 |
| V03-09 | Meta/detail | Detalhe combina header, resumo, ritmo, reminders, comentários, checklist, membros e ações em panels homogêneos; a hierarquia fica diluída. | alta | falta de Section/Panel variants | detail sections | 41, 43 |
| V03-10 | Meta/detail | Ações destrutivas e secundárias aparecem em `action-stack` junto de ações de conclusão/edição, sem agrupamento semântico forte. | média | action groups locais | Button variants/ActionGroup | 40, 43 |
| V03-11 | Equipes/lista | Há formulário inline de criação, CTA no header e CTA do empty state: caminhos concorrentes para a mesma ação. | alta | fluxo legado mantido após criação da página dedicada | uma ação primária + EmptyState | 41, 44 |
| V03-12 | Equipes/detail | Membros, roles e remoção usam linha flexível com select e botão; texto longo pode quebrar alinhamento. | média | MemberRow não é primitive | MemberRow/action menu | 41, 44, 46 |
| V03-13 | Modelos | Cards não usam estrutura consistente de descrição/footer e não exibem empty state com CTA de criação/retorno. | média | markup específico | Card/EmptyState | 41, 45 |
| V03-14 | Calendário | Timeline não oferece período, navegação anterior/próximo, hoje ou filtros; quando vazia vira apenas texto em box. | alta | primeira versão minimalista | CalendarHeader/EmptyState | 45 |
| V03-15 | Avisos | Navegação mostra “Avisos”, mas não há badge de unread; item usa button com aparência de card sem padrão de feedback. | alta | NotificationRow local | Notification primitives/badge | 45 |
| V03-16 | Perfil | Rota existe, mas não está visível na navegação principal; botão de avatar executa logout, confundindo identidade com ação destrutiva. | alta | affordance inadequada no shell | ProfileMenu/IconButton | 39, 45 |
| V03-17 | Onboarding | Prompt global pode ocupar o topo de qualquer tela; apesar de ocultar convite, falta tratamento de foco/dialog e ação de “aceitar convite” no próprio fluxo. | média | banner local sem primitive | Dialog/OnboardingCard | 38, 47 |
| V03-18 | Forms | Inputs e buttons têm estilos repetidos; `datetime-local`, select, textarea e button não compartilham altura/radius/focus tokens. | alta | CSS por classe de tela | FormField/Input/Button | 38, 40 |
| V03-19 | Empty/loading/error | `LoadingState`, `ErrorState` e `EmptyState` não compartilham composição visual; alguns estados são apenas `panel` com texto. | alta | estados criados em momentos diferentes | FeedbackBanner/Skeleton/EmptyState | 38, 41 |
| V03-20 | Global | Não há regra `prefers-reduced-motion`; animação `appear` sempre é aplicada. | média | motion token ausente | motion tokens/media query | 47 |
| V03-21 | Global | Status depende fortemente de cor de badge/borda e alguns textos muted têm contraste não verificado. | alta | sem semantic color/contrast audit | semantic tokens + text labels | 47–48 |
| V03-22 | Global | Conteúdo e comentários usam wrapping parcial; cards, activity e calendar devem ser testados com nomes/descrições longos. | média | regras distribuídas | typography/wrapping utilities | 46 |

## Decisões de refatoração

- Consolidar tokens primeiro; não corrigir telas com novos hex, margins ou paddings isolados.
- Extrair primitives de `app.tsx` sem alterar contratos de API ou regras de autorização.
- Manter o backend intacto salvo correção estritamente necessária ao contrato visual.
- Tratar perfil como destino próprio e separar a affordance de perfil da ação de logout.
- Manter a prioridade visual da progressão: progresso próprio, coletivo, ritmo, quase lá e conclusão.
