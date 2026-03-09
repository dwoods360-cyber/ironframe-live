import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Canonical tenant UUIDs (must match app/utils/tenantIsolation.ts TENANT_UUIDS for dashboard isolation)
const TENANT_UUIDS = {
  medshield: '5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01',
  vaultbank: 'c6932d16-a716-4a07-9bc4-6ec987f641e2',
  gridcore: '4d1ea1a4-b6a8-4d12-9eb3-2f0a64ad0ef7',
} as const;

async function main() {
  console.log('🧹 Purging legacy data...');
  // Wipe the slate clean in the correct relational order (respect FKs: company -> tenant)
  await prisma.agentLog.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.activeRisk.deleteMany();
  await prisma.policy.deleteMany();
  await prisma.department.deleteMany();
  await prisma.company.deleteMany();
  await prisma.tenant.deleteMany();

  console.log('🚀 Initiating Ironframe Baseline Seed (v1.1 TPRM)...');

  // 1. Establish Tenants (Constitutional) — fixed UUIDs for tenant isolation
  const tenantMedshield = await prisma.tenant.create({
    data: { id: TENANT_UUIDS.medshield, name: 'Medshield Health', slug: 'medshield', industry: 'Healthcare', ale_baseline: 1110000000n }
  });
  const tenantVaultbank = await prisma.tenant.create({
    data: { id: TENANT_UUIDS.vaultbank, name: 'Vaultbank Global', slug: 'vaultbank', industry: 'Finance', ale_baseline: 590000000n }
  });
  const tenantGridcore = await prisma.tenant.create({
    data: { id: TENANT_UUIDS.gridcore, name: 'Gridcore Energy', slug: 'gridcore', industry: 'Energy', ale_baseline: 470000000n }
  });

  // 2. Establish Companies (The 1st Party / Tenant Boundary) — each company scoped to one tenant
  const medshield = await prisma.company.create({
    data: { name: 'Medshield Health', sector: 'Healthcare', industry_avg_loss_cents: 1110000000n, infrastructure_val_cents: 1520000000n, tenantId: tenantMedshield.id }
  });

  const vaultbank = await prisma.company.create({
    data: { name: 'Vaultbank Global', sector: 'Finance', industry_avg_loss_cents: 590000000n, infrastructure_val_cents: 4250000000n, tenantId: tenantVaultbank.id }
  });

  const gridcore = await prisma.company.create({
    data: { name: 'Gridcore Energy', sector: 'Energy', industry_avg_loss_cents: 470000000n, infrastructure_val_cents: 2840000000n, tenantId: tenantGridcore.id }
  });

  // 2. Inject Policies (Agent 8 Targets)
  await prisma.policy.createMany({
    data: [
      { company_id: medshield.id, name: 'HIPAA Data Privacy', status: 'GAP DETECTED' },
      { company_id: medshield.id, name: 'Patient Access Control', status: 'COMPLIANT' },
      { company_id: vaultbank.id, name: 'SOC2 Type II Encryption', status: 'COMPLIANT' },
      { company_id: vaultbank.id, name: 'SWIFT Transaction Security', status: 'GAP DETECTED' },
      { company_id: gridcore.id, name: 'NIST 800-82 ICS Security', status: 'GAP DETECTED' },
      { company_id: gridcore.id, name: 'Physical Site Access', status: 'COMPLIANT' }
    ]
  });

  // 3. Inject Initial High-Risk Findings (Agent 4 Targets) — baseline empty after full purge; add risks via ingestion/triage.
  await prisma.activeRisk.createMany({
    data: [],
  });

  // 4. Inject N-Tier Supply Chain (Agent 10 / Ironmap Targets) - Tenant-scoped
  console.log('🔗 Mapping N-Tier Supply Chain...');

  await prisma.vendor.create({
    data: { tenantId: tenantMedshield.id, name: 'Azure Health', riskTier: 'HIGH' }
  });
  await prisma.vendor.create({
    data: { tenantId: tenantMedshield.id, name: 'KubeOps EU-West', riskTier: 'CRITICAL' }
  });
  await prisma.vendor.create({
    data: { tenantId: tenantGridcore.id, name: 'Schneider Electric', riskTier: 'HIGH' }
  });
  await prisma.vendor.create({
    data: { tenantId: tenantVaultbank.id, name: 'Palo Alto Networks', riskTier: 'CRITICAL' }
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