# MissionLive — Design System V1

## Objetivo

Este documento registra os fundamentos visuais usados no refinamento do Plano 03. A V1 prioriza clareza, leitura rápida de progresso, operação confortável em telas pequenas e consistência entre as áreas autenticadas.

## Princípios

- Mobile-first: o layout parte de larguras pequenas e cresce progressivamente.
- Hierarquia explícita: cada tela deve ter um título, contexto, ação principal e estado atual perceptíveis.
- Progresso legível: percentuais são derivados do estado real e acompanhados de texto quando a cor não for suficiente.
- Acessibilidade por padrão: foco visível, nomes acessíveis, contraste suficiente e suporte a `prefers-reduced-motion`.
- Sem cor solta: novos valores visuais devem usar tokens; hex literal é permitido apenas na definição dos tokens.
- Estados completos: loading, erro, vazio, sucesso, desabilitado e ação destrutiva precisam ter tratamento visual coerente.

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

Os tokens de estado possuem variantes `*-subtle` para fundos suaves. Componentes não devem introduzir uma nova cor sem atualizar esta fundação.

## Espaçamento e layout

O espaçamento usa uma escala baseada em `0.25rem`: `--space-1` a `--space-12`. Os tokens de composição definem as distâncias recorrentes:

- `--page-padding-mobile`, `--page-padding-tablet` e `--page-padding-desktop` controlam as margens laterais.
- `--page-max-width` limita a largura de leitura do conteúdo.
- `--section-gap-sm`, `--section-gap-md` e `--section-gap-lg` separam blocos de conteúdo.
- `--card-padding-sm`, `--card-padding-md` e `--card-padding-lg` padronizam painéis e cards.
- `--form-gap`, `--field-gap` e `--action-gap` mantêm formulários e grupos de ações previsíveis.

Quebras principais:

- até `720px`: navegação compacta, uma coluna e ações empilhadas quando necessário;
- `721px` a `1024px`: composição intermediária, com grids reduzidos;
- acima de `1024px`: shell completo e grids de conteúdo.

## Tipografia

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
