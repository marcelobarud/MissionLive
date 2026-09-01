# Status das fases

| Fase | Status | Evidência |
|---|---|---|
| 0 — Bootstrap documental e repositório | CONCLUÍDA | Workspaces, API/web mínimos, ambiente seguro, scripts, builds e testes smoke validados |
| 1 — Persistência e fundação NestJS | CONCLUÍDA | Prisma escolhido/documentado, schema/migration SQLite, seed, health, ValidationPipe, Helmet/CORS e filtro global validados |
| 2 — Shell frontend mobile-first | CONCLUÍDA | Rotas Início/Metas/Equipes, navegação desktop/mobile, cards, empty state, formulário inicial, focus states e build/teste web validados |
| 3 — Users e autenticação local | CONCLUÍDA | Cadastro, login, logout, sessões, verificação/recuperação local, cookie HttpOnly, guard e testes |
| 4 — Google OAuth | CONCLUÍDA / CONFIGURÁVEL | Adapter state/PKCE-ready, identidade unificada e callback; execução real depende de credenciais não fornecidas |
| 5 — Categories e Goal core | CONCLUÍDA | Categories/seed, Goal CRUD, tags, datas, status, escopo owner/membership e UI |
| 6 — Goal Steps e progresso individual | CONCLUÍDA | Checklist, ordenação, progresso próprio, recalculo e UI |
| 7 — Metas compartilhadas e roles | CONCLUÍDA | Roles, limite backend, políticas e testes negativos |
| 8 — Links de convite de meta | CONCLUÍDA | Hash, 24h, revogação, aceite transacional/idempotente e preview |
| 9 — Equipes e memberships | CONCLUÍDA | Teams, memberships, metas de equipe e autorização por equipe |
| 10 — Convites de equipe | CONCLUÍDA | Target team, role server-side e aceite seguro |
| 11 — Progresso coletivo e conclusão automática | CONCLUÍDA | Recalculo por participante e conclusão automática |
| 12 — Owner override | CONCLUÍDA | Override exclusivo do owner, motivo e preservação de pendências |
| 13 — Dashboard e análises | CONCLUÍDA | Cards, taxa derivada e agregações escopadas |
| 14 — Planos/entitlements | CONCLUÍDA | Plan development seguro, estrutura de subscription e service de entitlement |
| 15 — Hardening, UX e acessibilidade | EM ANDAMENTO | Revisão final de erros, acessibilidade, dependências e headers |
| 16–18 | PENDENTE | PostgreSQL, auditoria PDF e fechamento |
