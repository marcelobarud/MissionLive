# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pessoas que criam, acompanham e concluem metas individuais, compartilhadas ou de equipes. O uso inclui planejamento pessoal, desafios, hábitos, compras, famílias, casais e grupos de trabalho.

## Product Purpose

MissionLive torna metas claras, acompanháveis e colaborativas. O produto organiza objetivos em checklists, mostra progresso individual e coletivo e permite que equipes avancem juntas com segurança.

## Positioning

Uma única experiência de metas que preserva o progresso de cada participante enquanto coordena colaboração direta e por equipes, com autorização por recurso no backend.

## Operating Context

Aplicação web mobile-first, usada para consultar metas, marcar passos, acompanhar prazos, colaborar com participantes, administrar equipes e retomar atividades recentes.

## Capabilities and Constraints

- React + TypeScript + Vite no frontend; NestJS + TypeScript + REST no backend.
- SQLite no desenvolvimento; PostgreSQL deve ser validado antes de produção.
- Metas individuais e compartilhadas não usam equipe; metas de equipe herdam acesso exclusivamente de membros da equipe.
- Papéis contextuais: admin, editor e viewer. Owner é propriedade do recurso.
- Viewer pode visualizar e alterar somente o próprio progresso.
- O backend é a autoridade para autenticação, autorização, limites, convites, progresso e conclusão.
- A interface validada abrange Início, Metas, Equipes, detalhes, formulários, Perfil e autenticação, sem alterar regras de negócio.
- Não introduzir XP, achievements, streaks, rankings gamificados, cobrança real ou novas regras de negócio.

## Brand Commitments

O produto deve continuar reconhecível como MissionLive: claro, moderno, acolhedor, organizado, profissional, leve e mobile-first. A identidade aprovada usa neutros minerais, superfícies claras, grafite esverdeado e verde-sálvia como cor de ação e progresso. Tabler Icons deve ser preservado quando já adotado.

## Evidence on Hand

- Código e dados demonstrativos validados na cópia experimental e consolidados no repositório oficial.
- Rotas, componentes, estilos, tokens e testes frontend existentes.
- Evidências de crítica e direção visual mantidas em `.impeccable/` e no manifesto `DESIGN.md`.
- Não inventar claims, clientes, métricas comerciais ou credenciais.

## Product Principles

1. Progresso deve ser claro e derivado de dados reais.
2. Colaboração deve ser simples sem enfraquecer isolamento e autorização.
3. A experiência deve funcionar primeiro em telas pequenas e escalar progressivamente.
4. A interface deve favorecer clareza, ritmo e confiança em vez de complexidade decorativa.

## Accessibility & Inclusion

Preservar navegação por teclado, foco visível, semântica de headings e labels, contraste suficiente, alvos de toque confortáveis e estados de loading, erro, vazio e sucesso compreensíveis sem depender apenas de cor.
