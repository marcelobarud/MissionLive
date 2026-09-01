# ADR 0001 — Camada de persistência

## Status

Aceita na Fase 1.

## Decisão

Usar Prisma Client e Prisma Migrate com schema compatível com SQLite no desenvolvimento e PostgreSQL antes da produção.

## Motivos

- integra bem com NestJS e TypeScript;
- migrations versionadas e geração de tipos;
- constraints, índices e transações explícitas;
- suporta os dois bancos aprovados sem duplicar a camada de acesso;
- reduz SQL manual e facilita testes de isolamento no service/policy.

Tags e limites são armazenados como strings JSON portáveis entre SQLite e PostgreSQL, com validação no domínio. O schema usa strings para valores de status/role, permitindo validação central no backend e migrations simples entre os dois provedores.

## Alternativas consideradas

TypeORM tem integração NestJS forte, mas exige mais configuração e tende a esconder diferenças de migration entre SQLite e PostgreSQL. Drizzle tem excelente controle SQL, porém adicionaria mais código de schema e adaptação para o modelo relacional desta V1. Prisma foi escolhido pela menor superfície operacional para a equipe e pela geração de tipos.
