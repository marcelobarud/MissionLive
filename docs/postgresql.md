# Validação PostgreSQL

SQLite é o banco de desenvolvimento. Antes de produção, configure `POSTGRES_DATABASE_URL` apenas no ambiente local/CI e execute:

```powershell
./scripts/validate-postgres.ps1
```

O script cria um schema Prisma temporário com provider PostgreSQL, gera uma migration limpa do zero, aplica a migration no banco informado e remove os arquivos temporários. Nenhuma credencial é armazenada no repositório.

Neste ambiente há um serviço PostgreSQL local escutando, mas não há credencial fornecida para autenticação (`pg_hba.conf` exige SCRAM). A validação real contra PostgreSQL permanece `BLOQUEADA EXTERNAMENTE` até que o usuário/URL seja configurado.
