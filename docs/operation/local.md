# Operação local

1. Copie `.env.example` para `.env`.
2. Substitua `SESSION_SECRET` por um valor aleatório com ao menos 32 caracteres.
3. Execute `npm install`, `npm run db:migrate` e `npm run db:seed`.
4. Inicie com `npm run dev`.

O banco SQLite fica em `apps/api/data/missionlive.db` e é ignorado pelo Git. A API falha no startup se o segredo de sessão estiver ausente ou inseguro fora de testes.
