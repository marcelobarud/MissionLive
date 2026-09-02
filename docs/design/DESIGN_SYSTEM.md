# MissionLive — Design System V1

## Objetivo

Este documento registra os fundamentos visuais do MissionLive. A direção atual, refinada com `frontend-design`, é **movimento editorial**: uma base calma e clara para tornar o progresso legível, com navegação azul-marinho profunda, tipografia de alto contraste e superfícies contidas. A V1 prioriza clareza, leitura rápida de progresso, operação confortável em telas pequenas e consistência entre as áreas autenticadas.

## Princípios

- Mobile-first: o layout parte de larguras pequenas e cresce progressivamente.
- Hierarquia explícita: cada tela deve ter um título, contexto, ação principal e estado atual perceptíveis.
- Progresso legível: percentuais são derivados do estado real e acompanhados de texto quando a cor não for suficiente.
- Acessibilidade por padrão: foco visível, nomes acessíveis, contraste suficiente e suporte a `prefers-reduced-motion`.
- Sem cor solta: novos valores visuais devem usar tokens; hex literal é permitido apenas na definição dos tokens.
- Estados completos: loading, erro, vazio, sucesso, desabilitado e ação destrutiva precisam ter tratamento visual coerente.
- Assinatura visual: o azul-marinho profundo identifica o shell e o progresso; a composição usa uma única ação principal por contexto e reserva detalhes de contraste para orientar a leitura.

## Paleta aprovada

| Papel | Token | Valor |
| --- | --- | --- |
| Primária | `--primary` | `#09456c` |
| Primária hover | `--primary-hover` | `#0d5b89` |
| Primária ativa | `--primary-active` | `#063650` |
| Primária suave | `--primary-subtle` | `#e7f0f6` |
| Neutro forte | `--neutral-strong` | `#6c788e` |
| Neutro médio | `--neutral-medium` | `#a6aec1` |
| Neutro claro | `--neutral-light` | `#cfd5e1` |
| Superfície | `--surface` | `#ededf2` |
| Superfície elevada | `--surface-raised` | `#ffffff` |
| Superfície sutil | `--surface-subtle` | `#f7f8fa` |
| Fundo | `--background` | `#fcfdff` |
| Texto primário | `--text-primary` | `#172033` |
| Texto secundário | `--text-secondary` | `#425168` |
| Texto auxiliar | `--text-muted` | `#6c788e` |
| Borda | `--border` | `#cfd5e1` |
| Borda forte | `--border-strong` | `#a6aec1` |
| Sucesso | `--success` | `#246b52` |
| Atenção | `--warning` | `#8b5b20` |
| Perigo | `--danger` | `#a83245` |
| Informação | `--info` | `#145b80` |

Tokens de composição usados pela direção editorial:

| Papel | Token | Valor |
| --- | --- | --- |
| Tinta profunda do shell | `--ink-deep` | `#063650` |
| Tinta suave sobre shell | `--ink-soft` | `#dbe8ef` |
| Superfície de apoio | `--surface-tint` | `#f2f6f8` |
| Superfície de destaque | `--surface-warm` | `#fffdf8` |
| Borda discreta | `--border-faint` | `#e2e8ee` |

Os tokens de estado possuem variantes `*-subtle` para fundos suaves. Componentes não devem introduzir uma nova cor sem atualizar esta fundação.

## Espaçamento e layout

O espaçamento usa uma escala baseada em `0.25rem`: `--space-1` a `--space-12`. Os tokens de composição definem as distâncias recorrentes:

- `--page-padding-mobile`, `--page-padding-tablet` e `--page-padding-desktop` controlam as margens laterais.
- `--page-max-width` limita a largura de leitura do conteúdo.
- `--section-gap-sm`, `--section-gap-md` e `--section-gap-lg` separam blocos de conteúdo.
- `--card-padding-sm`, `--card-padding-md` e `--card-padding-lg` padronizam painéis e cards.
- `--form-gap`, `--field-gap` e `--action-gap` mantêm formulários e grupos de ações previsíveis.

Quebras principais:

- até `720px`: header compacto, drawer lateral, uma coluna e ações empilhadas quando necessário;
- `721px` a `1024px`: sidebar fixa mais estreita e composição intermediária, com grids reduzidos;
- acima de `1024px`: shell completo e grids de conteúdo.

## Navegação e shell

O shell autenticado usa uma sidebar azul-marinho como navegação principal em telas amplas. Ela fica fixa à esquerda, mantém a marca no topo, empilha as áreas Início, Metas, Equipes, Modelos, Calendário e Avisos e reserva a parte inferior para perfil e logout. O workspace permanece claro para que o progresso, os títulos e os estados sejam o foco da leitura.

Em telas menores, a sidebar vira um drawer acionado pelo botão de menu do header compacto. O drawer usa backdrop, fecha ao navegar ou pressionar ESC, bloqueia o scroll da página enquanto aberto e devolve o foco ao botão que o acionou. A navegação principal não é duplicada no topo nem em uma barra inferior.

Os itens usam `@tabler/icons-react`, preservam nomes textuais e indicam a rota ativa com `primary`, `primary-subtle` e um indicador lateral discreto. O link de perfil e o logout permanecem ações distintas; a área de conta não concede nenhuma permissão de domínio.

## Tipografia

- corpo: `Aptos`, com fallback para `Segoe UI` e sans-serif do sistema;
- display: a mesma família do sistema com escala curta, peso alto e tracking negativo para títulos de ação;
- `h1`: título da página e contexto principal;
- `h2`: seção ou painel relevante;
- `h3`: card ou agrupamento local;
- texto principal: leitura de conteúdo e formulários;
- texto auxiliar: metadados, instruções e estados secundários;
- labels sempre identificam o campo, sem depender apenas de placeholder.

O texto deve continuar compreensível quando ampliado e deve poder quebrar em nomes longos, títulos de goals e mensagens de erro.

## Primitives compartilhadas

As primitives ficam em `apps/web/src/design-system.tsx` e são estilizadas no final de `apps/web/src/styles.css`:

- `Button`: variantes `primary`, `secondary`, `danger` e `ghost`; suporta os atributos nativos de botão e estados desabilitado/foco.
- `IconButton`: botão compacto circular para ações representadas por ícone; sempre exige `aria-label` no uso.
- `Input`, `Textarea`, `Select` e `Checkbox`: controles nativos com classes de token para uso em novos formulários.
- `FormField`: label, hint e erro em uma composição acessível e consistente.
- `Panel`: superfície elevada para agrupar conteúdo, com padding e borda consistentes.
- `Card` e `Section`: bases semânticas para cards e seções compostas.
- `PageHeader`: eyebrow, título, subtítulo e ação principal em uma estrutura responsiva.
- `EmptyState`: estado vazio com ícone opcional, título, descrição e ação.
- `Spinner`: indicador de carregamento com nome acessível.
- `ProgressBar`: progresso semântico com `role="progressbar"`, valor limitado entre 0 e 100 e suporte a label.
- `Badge`: status compacto com tons semânticos `neutral`, `info`, `success`, `warning` e `danger`.

Wrappers de domínio existentes, como `StatusChip` e `ContextBadge`, devem compor essas primitives em vez de recriar estilos locais.

## Feedback e overlays

Os overlays compartilhados ficam em `apps/web/src/feedback.tsx` e são montados globalmente por `FeedbackProvider` em `apps/web/src/main.tsx`:

- `Dialog`: base semântica para conteúdo modal, com backdrop, `role="dialog"`, `aria-modal`, título/descrição associados e fechamento por ESC;
- `ConfirmDialog`: confirmação para ações destrutivas ou sensíveis, com variante semântica, cancelamento explícito e foco restaurado;
- `PromptDialog`: formulário curto para substituir prompts nativos, suportando campos de texto, data e textarea, validação e prevenção de submissão vazia;
- `Toast` e `ToastViewport`: feedback breve de sucesso, informação, atenção ou erro, com `aria-live`, fechamento manual e expiração automática;
- `FeedbackBanner`: mensagem persistente próxima ao contexto da ação para estados de erro, atenção ou informação.

### Regras

- Não usar `window.alert`, `window.confirm`, `window.prompt` ou equivalentes para feedback pertencente à aplicação.
- Interfaces do navegador/SO que pertencem à plataforma, como Web Share, seletor de arquivos, permissões e OAuth, permanecem nativas.
- Toda ação destrutiva ou alteração sensível deve explicar o impacto e usar `ConfirmDialog` antes da chamada assíncrona.
- O dialog deve ter foco inicial útil, manter TAB dentro da superfície, fechar com ESC quando permitido e devolver o foco ao controle que o abriu.
- Toast não substitui erro específico de campo; erros de validação continuam próximos ao input e mensagens de API podem usar o contexto da tela.

## Iconografia

`@tabler/icons-react` é a biblioteca oficial de ícones do frontend. Os imports são explícitos para preservar tree-shaking; não misturar bibliotecas de ícones sem decisão documentada.

- ícones compactos em botões: 18px;
- ícones padrão: 20px;
- navegação: 21px;
- destaques e empty states: 30–40px;
- stroke padrão: aproximadamente `1.9`;
- cor herdada pelo contexto (`currentColor`), sem hex hardcoded nos componentes;
- usar principalmente a família outline;
- `aria-label` é obrigatório para icon buttons e ícones que carregam significado sozinhos;
- ícones acompanham labels importantes, não substituem texto essencial;
- emojis de reação continuam sendo conteúdo do domínio, não ícones de interface.

## Regras de interação

- Todo controle interativo deve ter foco visível com `--focus-ring`.
- A altura mínima padrão de controles é `--control-height`; controles compactos usam `--control-height-small`.
- Ações perigosas usam a variante `danger` e texto explícito.
- Desabilitado reduz contraste e interação, mas não deve ser o único modo de comunicar uma condição.
- Mensagens de erro ficam próximas do campo ou ação que as originou.
- Animações são curtas e respeitam `prefers-reduced-motion: reduce`.
- Não depender de hover para revelar informação ou tornar uma ação possível.

## Checklist de implementação

Antes de considerar uma tela refinada:

1. conferir se cores, espaçamentos, raios e sombras vêm de tokens;
2. conferir loading, erro e vazio;
3. conferir foco por teclado, labels e nomes acessíveis;
4. conferir 360px, 768px e desktop;
5. conferir que a ação principal é única e está visível;
6. conferir que texto longo não quebra a composição;
7. registrar divergências no plano de QA visual.
