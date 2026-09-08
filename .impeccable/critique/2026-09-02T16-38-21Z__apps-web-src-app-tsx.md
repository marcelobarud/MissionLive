---
target_identity: "file:D:\\Codex\\MissionLive-Impeccable-Test\\apps-web-src-app-tsx"
timestamp: 2026-09-02T16-38-21Z
slug: apps-web-src-app-tsx
closed: true
---
Method: dual-agent (A: 01a062f5-0a98-7170-a4af-012e0271009f · B: 01a062f5-0bbe-7880-8f30-aeba01c858e6)

# MissionLive — critique Impeccable

## Escopo e impressão geral

Avaliação independente das rotas `/`, `/goals` e `/teams`, com leitura de PRODUCT.md, documentação do produto, código React/CSS e renderização local. A base atual é coerente, limpa e reconhecível: sidebar azul-marinho, superfícies claras, títulos fortes, progresso como elemento central e ícones consistentes. Não há bloqueador P0.

O problema principal é hierarquia, não acabamento. O mesmo ritmo de painéis e cartões aparece em quase tudo. O Início se comporta mais como relatório do que como ponto de retomada; Metas repete informação; Equipes parece entidade administrativa e não espaço de avanço coletivo.

## Design specificity

Fortes: combinação de sidebar profunda, títulos grandes e azul de progresso; paleta alinhada à promessa de acolhimento, organização e profissionalismo; consistência entre rotas.

Limites: Metas e Equipes reutilizam quase o mesmo padrão visual; “Progresso que inspira” é genérico para o estado real; rótulos em caixa alta como PRÓXIMO, RITMO e COLABORAÇÃO aparecem como decoração recorrente em vez de informação necessária; badges de contexto usam tom próximo de alerta.

## Nielsen 10 heuristics

Escala 0–4, onde 4 é problema grave.

| Heurística | Nota | Evidência |
|---|---:|---|
| Visibilidade do estado | 2 | Progresso existe, mas Taxa geral perde contraste no painel escuro. |
| Mundo real | 2 | Meta, passo, equipe e participante são claros; Ritmo é abstrato. |
| Controle e liberdade | 1 | Navegação é boa; falta limpar filtros e priorização explícita no dashboard. |
| Consistência | 2 | Visual consistente, sem distinção semântica suficiente entre metas e equipes. |
| Prevenção de erros | 1 | Controles e labels não apresentaram risco grave. |
| Reconhecimento | 2 | Contexto é reconhecível, mas responsabilidade individual em metas compartilhadas é pouco clara. |
| Flexibilidade | 2 | Busca, filtros e ordenação ajudam; o dashboard longo reduz eficiência. |
| Estética minimalista | 3 | Muitos módulos, estados vazios e dados repetidos competem pela atenção. |
| Recuperação de erros | 3 | Falhas de API em Metas/Equipes podem virar estado vazio; dashboard não oferece retry. |
| Ajuda | 2 | Há microcopy, mas falta explicar colaboração e filtros. |

## Prioridades

### P1 — Início sem foco operacional

O dashboard mede aproximadamente 2.885 px e empilha métricas, painéis, análises, retomadas e dez atividades. Vários módulos vazios têm peso visual semelhante ao que exige ação. A primeira dobra é boa, mas a pergunta “o que faço agora?” se perde depois dela. Priorizar uma faixa de próxima ação/urgência e empurrar histórico para uma camada secundária.

### P1 — Taxa geral com contraste fraco

`Taxa geral: 0%` é visualmente apagada sobre o painel azul-marinho. Usar valor e label com foreground claro de contraste alto, preservando o destaque sem esconder o estado.

### P2 — Erro confundido com vazio

GoalsPage e TeamsPage podem transformar falha de API em arrays vazios, levando a uma mensagem de ausência de dados. Separar loading, error e empty e oferecer recuperação contextual.

### P2 — Progresso duplicado em metas

`ProgressSummary` mostra a contagem de passos sob a barra e o card a repete no rodapé. Manter uma única contagem; usar o espaço restante para prazo, contexto ou próxima ação.

### P2 — Equipes pouco colaborativas

A listagem mostra nome, descrição, participantes e metas, mas não progresso, pendência, prazo ou saúde. Tornar o CTA explícito (`Criar equipe` ou `Nova equipe + meta`) e incluir apenas sinais reais derivados dos dados disponíveis.

## Carga cognitiva e jornada

Alex recebe acolhimento e um CTA claro, mas pode sentir que precisa interpretar um relatório antes de começar. Sam vê contexto compartilhado, mas não o que cabe a si. Casey/Jordan precisam abrir uma equipe para descobrir se há algo a fazer. A combinação de 0%, estados vazios e uma mensagem motivacional genérica enfraquece a transição entre confiança e ação.

## Forças a preservar

Navegação lateral, skip link, foco, progressbar, drawer mobile, reduced motion, estados básicos de loading, paleta azul-marinho/azul e a sensação de calma profissional. Nenhuma regra de negócio ou affordance nativa deve ser removida.

## Perguntas provocativas

- Se o dashboard serve para retomar movimento, por que histórico ocupa tanto espaço antes de uma ação prioritária?
- “Progresso que inspira” é a melhor mensagem quando o estado é 0%?
- Se colaboração é diferencial, por que Equipes não responde qual time precisa de mim agora?
- Quanto do peso desaparece removendo contagem duplicada e painéis vazios?
