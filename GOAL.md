# GOAL.md — GOAL Mestre MissionLive V1

## Objetivo

Executar de ponta a ponta a construção da V1 do MissionLive seguindo rigorosamente:
- `AI_CONTEXT.md`
- `AGENTS.md`
- `IMPLEMENTATION_PLAN.md`

Este é um GOAL de longa duração.

O trabalho deve ser executado fase a fase, em ordem, sem transformar o projeto em uma implementação monolítica difícil de validar.

## Ordem obrigatória de leitura

Antes de editar código:
1. leia integralmente `AI_CONTEXT.md`;
2. leia integralmente `AGENTS.md`;
3. leia integralmente `IMPLEMENTATION_PLAN.md`;
4. leia este `GOAL.md`;
5. inspecione o estado real do repositório;
6. compare o estado real com a primeira fase ainda não concluída.

Não assumir que documentação antiga está correta sem conferir o código.

## Regra principal

Implemente todas as fases do `IMPLEMENTATION_PLAN.md`, da Fase 0 à Fase 18, respeitando dependências e critérios de aceite.

Não pule uma fase funcional apenas para chegar mais rápido ao final.

Se uma fase já estiver materialmente concluída no repositório:
- valide;
- registre evidência;
- atualize o plano/status;
- prossiga.

## Autonomia

Tome decisões técnicas reversíveis quando necessário, desde que:
- não contrariem decisões de produto documentadas;
- não introduzam serviços pagos sem necessidade;
- não criem segredos;
- sejam documentadas quando arquiteturais.

Não interrompa o GOAL por detalhes menores que podem ser resolvidos com uma escolha técnica segura.

## Pontos que NÃO podem ser inventados

Não inventar:
- preços de planos;
- nomes definitivos de planos pagos;
- provider de cobrança;
- credenciais Google;
- secrets;
- domínios de produção;
- serviços de e-mail pagos;
- regras de produto que contradigam `AI_CONTEXT.md`.

Quando uma integração externa precisar de credencial:
- implemente o código/configuração;
- use placeholders seguros;
- crie testes/mocks;
- documente a configuração;
- continue as outras fases possíveis.

## Fases

Execute integralmente:

- Fase 0 — Bootstrap documental e repositório
- Fase 1 — Persistência e fundação NestJS
- Fase 2 — Shell React mobile-first
- Fase 3 — Users e autenticação local
- Fase 4 — Google OAuth
- Fase 5 — Categories e Goal core
- Fase 6 — Goal Steps e progresso individual
- Fase 7 — Metas compartilhadas e roles
- Fase 8 — Links de convite de meta
- Fase 9 — Equipes e memberships
- Fase 10 — Convites de equipe
- Fase 11 — Progresso coletivo e conclusão automática
- Fase 12 — Owner override
- Fase 13 — Dashboard e análises
- Fase 14 — Planos/entitlements sem cobrança real
- Fase 15 — Hardening, UX e acessibilidade
- Fase 16 — PostgreSQL antes de produção
- Fase 17 — Auditoria final de segurança
- Fase 18 — Fechamento V1

## Regras de implementação

### Arquitetura
- frontend React + TypeScript + Vite;
- backend NestJS + TypeScript;
- API REST;
- SQLite no desenvolvimento;
- PostgreSQL validado antes da produção;
- não implementar Capacitor nesta V1.

### Metas
Usar uma única entidade Goal.

Contexto:
- individual = owner sem team e sem convidados;
- compartilhada = owner + goal_members, sem team;
- equipe = team_id e acesso por team membership.

Nunca permitir compartilhar diretamente uma meta de equipe.

### Roles
- admin
- editor
- viewer

Owner é propriedade, não apenas role.

Viewer sempre pode:
- visualizar o que tem permissão;
- marcar/desmarcar o próprio checklist.

Viewer nunca pode:
- editar estrutura;
- alterar progresso alheio.

### Compartilhamento direto
- owner + no máximo 3 convidados;
- backend é autoridade do limite.

### Progresso
- checklist é comum;
- progresso é individual;
- cada step pode ser de todos os participantes ou de um participante específico;
- conclusão coletiva exige todos os participantes aplicáveis e não permite atribuição específica indisponível;
- percentuais contam somente obrigações aplicáveis a cada participante;
- membro novo entra no cálculo de meta ativa para steps atribuídos a todos;
- reatribuição não transfere progresso individual;
- owner override pode encerrar com pendências;
- override nunca altera/falsifica progressos individuais.

### Convites
- link genérico;
- expira em 24 horas;
- aceite explícito;
- retomar após auth;
- revalidar target/role/capacidade no servidor;
- aceite transacional;
- compartilhar por link/Web Share/fallbacks.

### Categorias
- categorias globais;
- opção UI "Outro";
- custom category não vira global automaticamente.

### Tags
- diretamente na meta;
- zero a 10;
- até 30 caracteres por tag;
- sem duplicatas normalizadas.

## Segurança transversal obrigatória

Em TODA fase, verificar:

### 1. Isolamento
Nenhuma query de:
- lista;
- busca;
- detalhe;
- agregação;
- dashboard;
- relatório;
- exportação futura

pode ignorar owner/membership/team.

### 2. Autorização backend
Cruzar qualquer gate do frontend com endpoint correspondente.

### 3. IDOR
Para todo handler com ID:
- provar que acesso ao recurso é validado.

### 4. Segredos
Verificar:
- fonte;
- env;
- `.env.example`;
- config;
- Docker/CI se houver;
- scripts;
- docs;
- bundle frontend.

### 5. XSS/input
Verificar:
- HTML inseguro;
- URLs controladas;
- markdown futuro;
- eval;
- templates;
- DTOs.

## Testes de segurança mínimos

Criar cenários com múltiplos usuários e provar:

- A acessa Goal A;
- A não acessa Goal B;
- A não edita Goal B;
- A não remove Goal B;
- viewer não edita estrutura;
- viewer marca apenas próprio progresso;
- editor não vira admin por manipulação do request;
- participante de Goal X não acessa Goal Y;
- usuário externo não acessa metas de Team;
- convite expirado falha;
- convite revogado falha;
- aceite duplicado é idempotente/seguro;
- owner + 3 convidados é limite real;
- team goal não aceita direct sharing;
- owner override é exclusivo do owner;
- dashboard não vaza contagens de terceiros.

## Banco

Ao chegar à Fase 16:
- não apenas alterar uma URL;
- executar migrations do zero em PostgreSQL;
- validar tipos/JSON/datas;
- validar constraints;
- validar índices;
- executar testes;
- corrigir incompatibilidades reais.

SQLite não pode ser considerado banco de produção.

## Auditoria final obrigatória

Na Fase 17, executar a auditoria real do código seguindo estas cinco categorias:
1. Banco sem tranca / isolamento ausente
2. Permissão definida somente no navegador
3. IDOR
4. Chaves/segredos expostos
5. Inputs sem tratamento / XSS

Detectar primeiro a stack real e adaptar a auditoria.

### Regras
- percorrer sistematicamente todos os handlers backend na auditoria de IDOR;
- reportar somente achados reais;
- informar arquivo e linha exata;
- trecho de código;
- explorabilidade;
- severidade;
- pontos fortes comprovados;
- condições necessárias para exploração.

### PDF
Gerar:

`docs/security-audit/relatorio-auditoria-seguranca.pdf`

Também manter o script regenerável em:

`docs/security-audit/`

O PDF deve conter:
- capa;
- data;
- escopo;
- metodologia;
- totais por severidade;
- gráfico de rosca;
- gráfico de barras por categoria;
- pontos fortes;
- pontos fracos;
- achados detalhados;
- recomendações P1/P2/P3;
- seção final "ISSUES PARA O GITHUB";
- issues completas em Markdown;
- critérios de aceite;
- A4;
- margens aproximadas de 2 cm;
- cabeçalho/rodapé;
- número de página.

Paleta:
- crítica `#B91C1C`
- alta `#EA580C`
- média `#D97706`
- baixa `#2563EB`
- ponto forte `#059669`

Não instalar ferramenta globalmente para gerar o relatório.
Usar ambiente isolado ou ferramenta já disponível.

Validar o PDF visualmente antes de concluir.

## Commits

Ao final de cada fase:
1. revisar alterações;
2. executar validações;
3. atualizar documentação/status;
4. criar um commit único e coerente da fase.

Formato:
`Fase N — <descrição>`

Não fazer push remoto sem solicitação explícita.

## Atualização do plano

No `IMPLEMENTATION_PLAN.md`, manter um status legível por fase, por exemplo:
- PENDENTE
- EM ANDAMENTO
- CONCLUÍDA
- BLOQUEADA EXTERNAMENTE

Uma fase só pode ser marcada CONCLUÍDA quando cumprir sua Definition of Done.

## Bloqueios externos

Exemplos:
- ausência de credencial Google;
- ausência de servidor SMTP/provider de e-mail;
- ausência de credencial de produção.

Nesses casos:
- não abandonar o GOAL;
- implementar tudo que puder ser testado localmente;
- usar mocks;
- documentar exatamente o que ficou dependente de credencial;
- continuar para outras fases que não dependam do bloqueio.

## Critério de encerramento do GOAL

O GOAL só está concluído quando:

- Fases 0–18 foram executadas ou justificadamente marcadas como bloqueadas apenas por dependência externa;
- frontend funciona mobile-first;
- backend funciona;
- autenticação local funciona;
- Google está integrado/configurável;
- metas individuais funcionam;
- compartilhamento direto funciona;
- equipes funcionam;
- roles funcionam;
- checklist funciona;
- progresso individual funciona;
- progresso coletivo funciona;
- owner override funciona;
- convites 24h funcionam;
- dashboard funciona;
- planos/entitlements estão preparados sem cobrança fictícia;
- PostgreSQL foi realmente validado;
- suite relevante está verde;
- builds passam;
- segurança transversal foi revisada;
- auditoria final foi feita;
- PDF foi gerado e validado;
- README/documentação estão atualizados;
- repositório está consistente.

## Relatório final do Codex

Ao terminar, apresentar resumo com:

1. fases concluídas;
2. commits criados;
3. arquitetura final;
4. testes backend;
5. testes frontend;
6. lint/typecheck/build;
7. migrations;
8. validação SQLite;
9. validação PostgreSQL;
10. autenticação e Google;
11. metas/equipes/convites;
12. segurança;
13. caminho do PDF;
14. bloqueios externos restantes;
15. backlog V2;
16. estado do Git.

Não declarar sucesso sem evidência verificável.
