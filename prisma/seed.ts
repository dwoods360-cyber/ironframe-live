import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Initiating Ironframe Baseline Seed...');

  // 1. Establish Tenants with ALE Baselines
  const tenants = await Promise.all([
    prisma.tenant.upsert({
      where: { id: 'medshield-id' },
      update: {},
      create: {
        id: 'medshield-id',
        name: 'Medshield Health',
        industry: 'Healthcare',
        ale_baseline: 11100000, // 11.1M
      },
    }),
    prisma.tenant.upsert({
      where: { id: 'vaultbank-id' },
      update: {},
      create: {
        id: 'vaultbank-id',
        name: 'Vaultbank Global',
        industry: 'Finance',
        ale_baseline: 5900000, // 5.9M
      },
    }),
    prisma.tenant.upsert({
      where: { id: 'gridcore-id' },
      update: {},
      create: {
        id: 'gridcore-id',
        name: 'Gridcore Energy',
        industry: 'Energy',
        ale_baseline: 4700000, // 4.7M
      },
    }),
  ]);

  // 2. Inject Initial High-Risk Vendors for Dashboard Triage
  await prisma.vendor.createMany({
    data: [
      {
        name: 'Azure Health',
        tenantId: 'medshield-id',
        riskTier: 'HIGH',
        healthScore: 84,
        isQuarantined: false,
      },
      {
        name: 'Schneider Electric',
        tenantId: 'gridcore-id',
        riskTier: 'HIGH',
        healthScore: 88,
        isQuarantined: false,
      },
      {
        name: 'Palo Alto Networks',
        tenantId: 'vaultbank-id',
        riskTier: 'CRITICAL',
        healthScore: 82,
        isQuarantined: false,
      },
    ],
  });

  console.log('✅ Ironframe Baseline Seed Complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });