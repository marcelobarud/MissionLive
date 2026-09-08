# Migração do experimento para o projeto oficial — 2026-09-08

## Escopo e origem

Esta migração consolida o estado validado de `MissionLive-Impeccable-Test` no projeto oficial sem mesclar históricos e sem reproduzir a sequência de correções intermediárias.

- base experimental: `fb3af27`
- base oficial: `ffaad94ae78318f1512da0089b85d21010710aff`
- árvore comum das bases: `6ea5fe73721d1a0cd584c46d6dba9fddd2306419`
- estado experimental final: `d3da655`
- branch oficial de migração: `codex/migracao-experimento-validado`
- total de commits experimentais considerados: 41 (40 previamente auditados e o ajuste final de Perfil)

O banco, uploads, arquivos temporários e regras do Firewall do Windows não foram copiados do experimento.

## Backup e migrations

O banco oficial foi copiado antes de qualquer migration para:

`D:\Codex\backups\MissionLive\missionlive-pre-migracao-20260908.db`

SHA-256 do banco e da cópia no momento do backup:

`0D148514F43BAE7599462DE0C571B2C97F40BD7C0A1D7FE63E62815353362994`

As duas migrations novas foram aplicadas primeiro em banco vazio, depois em uma cópia do banco oficial com oito migrations e, por fim, no banco oficial. Os três fluxos chegaram a dez migrations aplicadas. O banco oficial pós-migration ficou com SHA-256 `EA52B39E730180687739CFCC3FA1626ACACE6AB404FB88D2236C0DB05556923F`.

## Consolidação dos commits

### 1. `3d2b9a0 chore: integrar fluxo visual Impeccable`

Origem principal:

- `f4854a6` — instalação e motor Impeccable;
- `f002acd` — documentação do sistema visual.

Inclui scripts, hooks, configuração, evidências, `PRODUCT.md` e `DESIGN.md`. A documentação foi alinhada ao estado realmente aprovado: paleta neutra/sálvia, cards restaurados em Metas e navegação final.

### 2. `5e7d081 feat: adicionar imagem principal às equipes`

Origem principal:

- `a32a64b`, `2cf5b91`, `580e1ef`, `56bab5c`, `8b75ff5`, `f86d97b`, `8a41fda`, `2883142` e `bb0bc4b`.

Consolida modelagem, armazenamento WebP, validações, permissões, interface, modal, fallback e ordem da tela da equipe.

### 3. `0810b4b feat: atribuir responsáveis aos passos`

Origem principal:

- `f672597`, `8af9a2a`, `eceb330`, `6fd86b5`, `bf0d52d`, `16f1471` e `d349c3c`.

Consolida persistência, autorização, aplicabilidade, percentuais e todos os pontos de criação/edição de passos.

### 4. `a5c8744 refactor: aplicar frontend e identidade visual validados`

Origem principal:

- `c7d473e`, `d4647f3`, `055cb30`, `e22ae4a`, `f1f750f`, `22f39e9`, `c78cf23`, `bffabac`, `853e1d4`, `278db8c`, `433b21a`, `2d1e3ae`, `9e24b40`, `e3f313f`, `8399525`, `55d7fec`, `49aea6a`, `7c21d16`, `dbceaed`, `b254a8f` e `d3da655`.

É o estado visual final já refinado, sem preservar versões intermediárias que foram corrigidas posteriormente.

### 5. `9acbc70 chore: tornar acesso pela rede local opt-in`

Origem principal:

- `bfa3d3e`, complementado pelos hardenings realizados durante a migração oficial.

Mantém localhost como padrão e separa endereço de escuta, CORS, URL canônica de convites e URL da API consumida pelo frontend.

### 6. `docs: registrar migração experimental e configurar vault`

Origem principal:

- `e48a165`, adaptado para preservar a configuração já existente no vault oficial;
- esta nota de migração.

Somente `app.json`, `appearance.json` e `core-plugins.json` são versionados. `workspace.json` e `graph.json` permanecem locais.

## Diferenças intencionais em relação ao experimento

- imagens de equipes são entregues apenas por `GET /teams/:teamId/image`, com autenticação e verificação de membership;
- não existe exposição pública da imagem por UUID;
- a exclusão da equipe também remove sua imagem armazenada;
- respostas de mídia usam política `Cross-Origin-Resource-Policy: same-site`, e imagens privadas de equipe enviam credenciais no frontend;
- Google Login, avatar enviado e imagens de equipe usam a fronteira configurável `API_URL`, sem referência direta a `localhost:3000` nesses fluxos;
- LAN é opt-in por `API_HOST=0.0.0.0` e `VITE_DEV_HOST=0.0.0.0`;
- `WEB_ORIGIN` continua sendo uma URL canônica única para convites e não é reutilizada como lista de CORS;
- o backend encontra o `.env` da raiz quando iniciado pelo workspace;
- a migration de imagem altera apenas o campo necessário no schema, sem reformatação cosmética integral.

## Assets aprovados

O pacote oficial foi comparado byte a byte com o pacote aprovado. Referências SHA-256:

- `apps/web/public/brand/missionlive-logo-dark.svg`: `5EBF8173B7C9D3EFA4137C3B0CAB6B562DC48F66ECBF07998682EC87E86C494A`
- `apps/web/public/brand/favicon/favicon.ico`: `D245CFC96573D2730989D93E8863332D0E4CAF7F821CB4037B66814A9B727840`
- `missionlive-brand-final/reference/faithful-master-transparent.png`: `3A264ECEC8D8A365A3AACD282EB7C0D982238194CBD7F79A341F61B3230E6678`

## Validações

- `prisma validate`, `prisma generate` e `prisma migrate status`: aprovados;
- migration do zero com dez migrations: aprovada;
- upgrade de oito para dez migrations em cópia do banco oficial: aprovado;
- `npm run typecheck`: aprovado;
- `npm run lint`: aprovado;
- `npm run test`: aprovado (API: 6 suítes/40 testes; web: 6 arquivos/22 testes);
- `npm run build`: aprovado;
- smoke test em banco temporário: login, onboarding, criação de equipe, meta e passo atribuído, upload, persistência, exibição autenticada, remoção e fallback aprovados;
- interface: modal centralizado sobre toda a aplicação, ordem Metas/Participantes, Perfil e viewport mobile de 390 × 844 revisados.

O detector Impeccable foi executado no modo disponível neste ambiente. Como os módulos opcionais de parser não estavam instalados, a análise ficou degradada e registrou principalmente seletores/tokens CSS legados sobrepostos pelos blocos finais validados. Essa dívida não justificou reabrir o redesign durante a migração.

Não havia instância PostgreSQL configurada para validação integrada. Isso permanece uma dependência externa; as migrations SQLite não foram alteradas para simular esse ambiente.

## Comparação final com o experimento

O manifesto SHA-256 dos arquivos rastreados encontrou 29 caminhos diferentes entre os repositórios. Todos foram classificados: configuração de ambiente/LAN, hardenings da mídia privada, testes correspondentes, documentação corrigida, preservação do formato original do schema e do migration lock, configuração local do Obsidian ou esta documentação oficial. Os demais arquivos migrados coincidem com o estado experimental validado.

## Limites operacionais

- nenhum remote foi adicionado ou alterado;
- nenhum push foi executado;
- regras locais de firewall não fazem parte do repositório;
- bancos e uploads locais continuam ignorados pelo Git.
