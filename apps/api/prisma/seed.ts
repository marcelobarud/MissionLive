import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = ['Pessoal', 'Saúde', 'Esportes', 'Família', 'Relacionamento', 'Estudos', 'Profissional', 'Finanças', 'Compras', 'Viagem'];
  for (const name of categories) await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  await prisma.plan.upsert({
    where: { code: 'development' },
    update: {},
    create: { code: 'development', name: 'Plano de desenvolvimento', limitsJson: '{}', isActive: true },
  });
}

main().catch((error) => { console.error('Seed failed:', error instanceof Error ? error.message : 'unknown error'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
