# AGENTS.md — MissionLive

## 1. Missão do agente

Trabalhar no MissionLive como engenheiro de software responsável por implementar uma V1 segura, testável, mobile-first e preparada para evolução.

Antes de qualquer trabalho relevante, ler:
1. `AI_CONTEXT.md`
2. `IMPLEMENTATION_PLAN.md`
3. `GOAL.md`

Este arquivo define COMO trabalhar.
`AI_CONTEXT.md` define O QUE o produto é.
`IMPLEMENTATION_PLAN.md` define a sequência.
`GOAL.md` define o objetivo mestre e critérios de conclusão.

## 2. Regra de contexto

Não inventar decisões de produto quando já existe uma decisão documentada.

Se uma informação estiver ausente:
- escolher a alternativa mais simples e reversível;
- registrar a decisão técnica em documentação/ADR quando for arquitetural;
- não introduzir serviços pagos ou dependências externas desnecessárias;
- nunca inventar credenciais, secrets ou configurações reais.

Manter `AI_CONTEXT.md` atualizado quando uma decisão consolidada mudar.

## 3. Stack

Base aprovada:
- React + TypeScript + Vite
- NestJS + TypeScript
- SQLite no desenvolvimento inicial
- PostgreSQL antes da produção
- Capacitor apenas em evolução futura

Não substituir framework principal sem necessidade explícita.

ORM/query layer ainda precisa ser escolhido na Fase 1.
A escolha deve ser documentada e suportar SQLite + PostgreSQL com migrations confiáveis.

## 4. Estrutura de repositório

Preferência para um único repositório organizado, por exemplo:

```text
MissionLive/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   └── shared/        # apenas se houver benefício real
├── docs/
├── AI_CONTEXT.md
├── AGENTS.md
├── IMPLEMENTATION_PLAN.md
└── GOAL.md
```

Pode adaptar nomes se a estrutura inicial do repositório exigir, mas manter separação clara entre frontend, backend e documentação.

Evitar criar package compartilhado antes de existir uso real.

## 5. Segurança é requisito de implementação

Toda fase deve revisar:

- autenticação;
- autorização no backend;
- isolamento por owner/membership/team;
- IDOR;
- validação de DTO/input;
- segredos;
- XSS;
- logs sensíveis;
- dependências;
- testes negativos.

Frontend não concede permissão.

Uma UI escondida não é controle de acesso.

## 6. Regras de autorização essenciais

### Goal individual
Acesso baseado em owner.

### Goal compartilhado
Acesso baseado em:
- owner;
- `goal_members`.

Limite:
- owner + 3 convidados.

### Goal de equipe
Acesso baseado exclusivamente em:
- owner da equipe;
- `team_members`.

Proibido compartilhar goal de equipe diretamente.

### Roles
- admin
- editor
- viewer

Owner é propriedade, não uma role comum.

### Viewer
Pode:
- visualizar;
- marcar/desmarcar o próprio `goal_step_progress`.

Não pode:
- editar estrutura;
- alterar progresso alheio;
- administrar membros.

### Owner override
Somente o owner possui o poder excepcional de concluir a meta com pendências.
Não falsificar progresso individual.

## 7. Padrão obrigatório para queries

Evitar handlers que façam:

```ts
findOne({ id })
```

e assumam autorização.

Preferir serviços/policies que recebam contexto autenticado e resolvam acesso por:
- owner;
- membership;
- team membership;
- role.

Centralizar autorização quando possível.
Não espalhar lógica inconsistente por controllers.

## 8. Convites

Links de convite:
- token imprevisível;
- expiração de 24h;
- token secreto não deve ficar persistido em claro sem necessidade;
- aceite explícito;
- revalidar permissão/capacidade no aceite;
- aceite transacional;
- link de team cria team membership;
- link de goal somente para goal sem team;
- link de goal respeita owner + 3 convidados.

Rotas de convite não devem aceitar role/target confiando em dados manipuláveis do cliente.

## 9. Banco e migrations

- toda alteração de schema via migration;
- sem editar migration já aplicada para "consertar histórico", salvo fase inicial ainda não publicada e documentada;
- constraints no banco quando apropriado;
- índices para FKs e consultas importantes;
- UNIQUE para memberships/progress;
- transações para operações multi-entidade;
- testar migration do zero;
- preparar compatibilidade PostgreSQL desde o início.

## 10. Validação

Backend:
- DTOs explícitos;
- ValidationPipe/config equivalente;
- limites de tamanho conforme `AI_CONTEXT.md`;
- enums;
- datas coerentes;
- rejeitar combinações inválidas.

Frontend:
- validação para UX;
- nunca substituir validação backend.

## 11. Testes

Cada fase funcional deve incluir testes.

Backend:
- unitários onde agregam valor;
- integração/API;
- autorização;
- testes negativos;
- concorrência/transaction quando relevante.

Frontend:
- componentes/fluxos críticos;
- estados de loading/error/empty;
- gates visuais alinhados às permissões reais.

Sempre que houver isolamento:
- criar pelo menos Usuário A e Usuário B;
- provar que A não acessa dados de B.

Não considerar uma fase concluída com testes relevantes quebrados.

## 12. Qualidade

Antes de concluir fase:
- lint;
- typecheck;
- testes;
- build frontend;
- build backend;
- migrations/checks aplicáveis.

Evitar:
- `any` desnecessário;
- arquivos gigantes;
- services com múltiplas responsabilidades;
- duplicação de regras;
- lógica de autorização no React;
- comentários que apenas repetem o código.

## 13. UI/UX

Mobile-first de verdade:
- começar pela largura pequena;
- ações principais acessíveis;
- cards legíveis;
- áreas de toque confortáveis;
- sem depender de hover;
- responsividade progressiva para desktop.

Visual de progresso:
- barras;
- percentuais derivados;
- estados de conclusão;
- feedback visual.

Não implementar sistemas de XP/achievements na V1.

## 14. Logs e erros

- mensagens de erro úteis ao cliente sem vazar detalhes internos;
- não vazar stack trace em produção;
- não logar senha/token/secret;
- logs estruturados quando viável;
- preservar contexto suficiente para diagnóstico sem dados sensíveis.

## 15. Dependências

Antes de adicionar dependência:
- confirmar necessidade;
- preferir biblioteca mantida;
- evitar duplicar capacidade já existente;
- manter superfície de ataque pequena.

Não instalar ferramentas globalmente por conveniência.

## 16. Git

Trabalhar de forma incremental.

Ao final de cada fase:
- revisar diff;
- garantir que documentação da fase esteja atualizada;
- deixar árvore consistente;
- criar commit de fase quando o fluxo do GOAL estiver sendo executado.

Formato sugerido:
`Fase N — <descrição curta>`

Não fazer push remoto sem solicitação explícita.

Não reescrever histórico remoto ou usar ações destrutivas sem necessidade explícita.

## 17. Documentação

Manter:
- `AI_CONTEXT.md`;
- `IMPLEMENTATION_PLAN.md`;
- documentação técnica relevante em `docs/`;
- decisões arquiteturais quando necessário;
- instruções de execução local;
- `.env.example` apenas com placeholders seguros.

## 18. Auditoria final de segurança

A última fase deve executar auditoria sistemática das cinco categorias:
1. isolamento;
2. permissão somente no frontend;
3. IDOR;
4. segredos;
5. XSS/input.

A auditoria deve percorrer handlers reais e gerar o relatório final previsto no `GOAL.md`.

Achados devem ser reais e evidenciados.
Não fabricar vulnerabilidades apenas para preencher relatório.

## 19. Fluxo visual do frontend

Para tarefas de criação, redesign ou refatoração significativa do frontend, seguir permanentemente esta sequência:

1. compreender o contexto visual existente;
2. preservar a identidade e o design system do projeto;
3. utilizar `frontend-design` para criação ou refinamento visual;
4. implementar a direção definida;
5. utilizar `web-design-guidelines` para auditar a implementação;
6. corrigir os problemas encontrados;
7. validar responsividade, acessibilidade e testes.

### Responsabilidade das skills

#### `frontend-design`

Utilizar em criação de páginas, redesign, refatoração visual, criação de componentes, dashboards, layouts, melhorias significativas de composição e definição ou refinamento de direção estética.

Sua responsabilidade principal é direção visual, composição, hierarquia, tipografia, espaçamento, cores, tokens, componentização visual, identidade, responsividade, motion quando apropriado e acabamento.

#### `web-design-guidelines`

Utilizar após a implementação visual para auditar acessibilidade, usabilidade, interações, semântica, responsividade, formulários, estados, navegação e boas práticas de interface.

### Regra de precedência

`frontend-design` define e implementa a direção estética. `web-design-guidelines` audita a implementação posteriormente. Em conflito envolvendo acessibilidade, usabilidade, semântica, interação ou comportamento, as guidelines têm precedência. Em decisões puramente estéticas sem conflito funcional, a direção estabelecida pelo design pode ser preservada.

### Regra contra excesso de redesign

Não modificar elementos apenas para demonstrar uso de uma skill. Toda mudança deve melhorar coerência, clareza, acessibilidade, responsividade ou qualidade visual.

### Regra contra AI slop

Evitar aparência genérica de dashboard gerado por IA, excesso de cards desnecessários, gradients gratuitos, glassmorphism sem propósito, sombras exageradas, bordas em absolutamente tudo, excesso de badges ou pills, textos auxiliares redundantes, ícones meramente decorativos, layouts visualmente repetitivos, excesso de cores, hierarquia fraca e espaçamento inconsistente.

### Regra de preservação

As skills nunca justificam remoção de funcionalidade, alteração de regras de negócio, mudança de contratos de API, perda de acessibilidade ou perda de responsividade.
