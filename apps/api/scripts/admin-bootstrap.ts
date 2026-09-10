import { PrismaClient } from '@prisma/client';
import { AdminAuditService } from '../src/admin/admin-audit.service';
import { AdminBootstrapService } from '../src/admin/admin-bootstrap.service';
import { PrismaService } from '../src/prisma/prisma.service';

function readEmail() {
  const index = process.argv.findIndex((argument) => argument === '--email');
  const email = index >= 0 ? process.argv[index + 1] : undefined;
  if (!email || email.startsWith('--')) throw new Error('Uso: npm run admin:bootstrap -- --email usuario@dominio.com');
  return email;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const prismaService = prisma as unknown as PrismaService;
    const audit = new AdminAuditService(prismaService);
    const bootstrap = new AdminBootstrapService(prismaService, audit);
    const result = await bootstrap.bootstrapSuperAdmin(readEmail());
    console.log(result.promoted ? `Superadministrador configurado para ${result.email}.` : `O usuário ${result.email} já era superadministrador.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Não foi possível concluir o bootstrap administrativo.');
  process.exitCode = 1;
});
