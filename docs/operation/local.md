# Operação local

1. Copie `.env.example` para `.env`.
2. Substitua `SESSION_SECRET` por um valor aleatório com ao menos 32 caracteres.
3. Execute `npm install`, `npm run db:migrate` e `npm run db:seed`.
4. Inicie com `npm run dev`.

O banco SQLite fica em `apps/api/prisma/data/missionlive.db` e é ignorado pelo Git. A API falha no startup se o segredo de sessão estiver ausente ou inseguro fora de testes. O backend procura o `.env` da raiz mesmo quando é iniciado diretamente pelo workspace da API.

O Prisma está fixado em uma versão estável anterior ao advisory de `deepmerge-ts` observado no tooling de configuração. Reavalie a atualização em conjunto com o próximo upgrade major do Prisma.

Fotos de perfil são processadas pela API e armazenadas localmente em `apps/api/var/avatars` (ou no caminho definido por `AVATAR_STORAGE_DIR`). O banco guarda apenas o tipo e a chave interna do arquivo; a pasta é criada automaticamente e não deve ser versionada.

Imagens de equipe seguem a mesma estratégia em `apps/api/var/uploads/teams` (ou `TEAM_IMAGE_STORAGE_DIR`). Elas são servidas apenas pela rota autenticada da equipe.

## Web Push local

Avisos internos funcionam sem configuração de push. Para ativar Web Push no desenvolvimento, gere um par VAPID local sem versionar as chaves:

```text
npx web-push generate-vapid-keys
```

Copie os valores gerados para `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` no `.env` local e configure `VAPID_SUBJECT` com um contato, por exemplo `mailto:dev@example.invalid`. As três variáveis devem ser configuradas juntas; em produção são obrigatórias. O navegador deve estar em `localhost` ou em uma origem HTTPS para permitir Service Worker e Push API.

O frontend registra o Service Worker sem solicitar permissão. A permissão só é pedida após o usuário clicar em “Ativar notificações”.

## Acesso opcional pela rede local

O padrão escuta somente no loopback. Para abrir o ambiente em um telefone na mesma rede, configure explicitamente `API_HOST=0.0.0.0`, `VITE_DEV_HOST=0.0.0.0`, `VITE_API_URL=http://<IP_LOCAL>:3000` e inclua `http://<IP_LOCAL>:5173` em `CORS_ORIGINS`. `WEB_ORIGIN` continua sendo uma origem única e canônica para links de convite. Não versione IPs, secrets nem regras locais do firewall.
