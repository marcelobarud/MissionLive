# Operação local

1. Copie `.env.example` para `.env`.
2. Substitua `SESSION_SECRET` por um valor aleatório com ao menos 32 caracteres.
3. Execute `npm install`, `npm run db:migrate` e `npm run db:seed`.
4. Inicie com `npm run dev`.

O banco SQLite fica em `apps/api/data/missionlive.db` e é ignorado pelo Git. A API falha no startup se o segredo de sessão estiver ausente ou inseguro fora de testes.

O Prisma está fixado em uma versão estável anterior ao advisory de `deepmerge-ts` observado no tooling de configuração. Reavalie a atualização em conjunto com o próximo upgrade major do Prisma.

Fotos de perfil são processadas pela API e armazenadas localmente em `apps/api/var/avatars` (ou no caminho definido por `AVATAR_STORAGE_DIR`). O banco guarda apenas o tipo e a chave interna do arquivo; a pasta é criada automaticamente e não deve ser versionada.
