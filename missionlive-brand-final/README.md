# MissionLive — pacote final de branding

Pacote final de assets derivado da versão `faithful` aprovada visualmente do Conceito B. A faithful é a fonte de verdade desta identidade; as versões V4, V4.1, V4.2 e `faithful-editable` não foram usadas para reinterpretar a aparência.

## Natureza do master

O símbolo faithful original é uma imagem raster. Para preservar exatamente sua aparência, os SVGs autocontidos do símbolo incorporam o master PNG em Base64. Isso é intencional nesta etapa de empacotamento final:

- mantém a aparência aprovada;
- evita redesenho ou alteração de proporções;
- funciona diretamente em `<img>`, navegadores e ferramentas de design;
- não deve ser confundido com o SVG vetorial editável experimental da pasta `missionlive-brand-concept-b-faithful-editable`.

O SVG continua sendo o formato de distribuição recomendado, mas o master visual é raster-backed. Uma conversão adicional para paths editáveis exigiria revisão e não seria pixel-identical à faithful.

## Paleta

| Token | HEX | Uso |
|---|---|---|
| Brand Dark | `#10352F` | fundos, app icon e variante escura |
| Brand Primary | `#1E5A4A` | aplicação principal |
| Brand Mid | `#3F7B69` | apoio e variações futuras |
| Off White | `#F7FAF8` | detalhes claros e fundos |
| Ink | `#0D1F1B` | wordmark em fundo claro |

A faithful possui variação tonal raster própria; ela foi preservada no símbolo primary. As variantes monocromáticas usam a paleta consolidada acima.

## Tipografia

- Família: `Manrope`;
- Peso do wordmark: `700`;
- Assinatura: `500`;
- Capitalização: `MissionLive`;
- Fallbacks: `Inter, Arial, sans-serif`.

`Metas Claras` aparece somente no logo institucional.

## Assets principais

| Arquivo | Uso |
|---|---|
| `svg/missionlive-symbol.svg` | sidebar, avatar, ícone |
| `svg/missionlive-logo-horizontal.svg` | header, landing |
| `svg/missionlive-logo-vertical.svg` | login, splash |
| `svg/missionlive-logo-institutional.svg` | branding institucional |
| `svg/missionlive-logo-white.svg` | fundo escuro |
| `svg/missionlive-logo-dark.svg` | fundo claro |

## PNGs

- `png/missionlive-symbol-1024.png`
- `png/missionlive-symbol-512.png`
- `png/missionlive-symbol-256.png`
- `png/missionlive-logo-horizontal-1024.png`
- `png/missionlive-app-icon-512.png`
- `png/missionlive-app-icon-192.png`
- `png/missionlive-apple-touch-icon-180.png`
- `png/favicon-32.png`
- `png/favicon-16.png`

## App icons

- 512 × 512: `png/missionlive-app-icon-512.png`
- 192 × 192: `png/missionlive-app-icon-192.png`
- 180 × 180: `png/missionlive-apple-touch-icon-180.png`

O símbolo usa safe area aproximada de 13,7% em cada lado sobre fundo `Brand Dark`.

## Favicons

- `favicon/favicon.svg`
- `favicon/favicon.ico` com entradas PNG 32 × 32 e 16 × 16
- `favicon/favicon-32.png`
- `favicon/favicon-16.png`

Em 16 px, detalhes da faithful naturalmente perdem definição; nenhuma micro-versão nova foi inventada.

## Regras básicas

- não distorcer;
- não alterar a proporção;
- não aplicar sombras;
- não trocar cores fora da paleta;
- manter a safe area do app icon;
- não adicionar slogan aos assets compactos;
- usar o logo institucional somente quando `Metas Claras` for necessário.

## Preview

Abra `preview/index.html` localmente para revisar símbolo, logos, app icons e favicons em fundos claros e escuros.

## Escopo

Este pacote não foi aplicado ao MissionLive. Nenhum arquivo do app foi alterado e nenhum push foi realizado.
