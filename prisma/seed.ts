import { PrismaClient, ThreatState, UserRole } from '@prisma/client';
import { seedSyntheticEmployees, SYNTHETIC_SEED_ROW_COUNT } from './seed-synthetic';

const prisma = new PrismaClient();

// Canonical tenant UUIDs (must match app/utils/tenantIsolation.ts TENANT_UUIDS for dashboard isolation)
const TENANT_UUIDS = {
  medshield: '5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01',
  vaultbank: 'c6932d16-a716-4a07-9bc4-6ec987f641e2',
  gridcore: '4d1ea1a4-b6a8-4d12-9eb3-2f0a64ad0ef7',
} as const;

/** Air-gapped prospect pool — matches tests/unit/agentPerimeter.test.ts and Ironleads ingress default. */
const PROSPECT_POOL_TENANT_ID = '11111111-1111-4111-8111-111111111111';

/**
 * Seeds the full constitutional role bundle on all canonical tenants for the dev Supabase user
 * (`IRONFRAME_DEV_SUPABASE_USER_ID`) so Meta-Audit / HITL RBAC passes in local dev.
 * Also mirrored at runtime by `devConstitutionalElevation.ts` when elevation is enabled.
 */
async function seedDevGlobalAdminAssignments(prisma: PrismaClient): Promise<void> {
  const userId = process.env.IRONFRAME_DEV_SUPABASE_USER_ID?.trim();
  if (!userId) {
    console.log(
      'ℹ️  Skipping UserRoleAssignment dev seed — set IRONFRAME_DEV_SUPABASE_USER_ID to your Supabase `auth.users.id`.',
    );
    return;
  }
  await prisma.userRoleAssignment.deleteMany({ where: { userId } });
  const roles: UserRole[] = ["INTERNAL_AUDITOR", "GLOBAL_ADMIN", "CISO", "GRC_MANAGER"];
  for (const tenantId of Object.values(TENANT_UUIDS)) {
    for (const role of roles) {
      await prisma.userRoleAssignment.create({
        data: { userId, tenantId, role },
      });
    }
  }
  console.log(
    `✅ UserRoleAssignment constitutional bundle (${roles.join(", ")}) for dev user across tenants (${userId.slice(0, 8)}…).`,
  );
}

/** Design-partner tenants preserved across baseline seed (production smoke / Wil sign-off). */
const PRESERVED_TENANT_SLUGS = ['bwc'] as const;

async function main() {
  console.log('🧹 Purging legacy data...');
  // Wipe the slate clean in the correct relational order (respect FKs: company -> tenant)
  await prisma.marketBenchmarkSnapshot.deleteMany();
  await prisma.threatEvent.deleteMany();
  await prisma.agentLog.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.activeRisk.deleteMany();
  await prisma.policy.deleteMany();
  await prisma.department.deleteMany();
  await prisma.company.deleteMany({
    where: { tenant: { slug: { notIn: [...PRESERVED_TENANT_SLUGS] } } },
  });
  await prisma.tenant.deleteMany({
    where: { slug: { notIn: [...PRESERVED_TENANT_SLUGS] } },
  });

  console.log('🚀 Initiating Ironframe Baseline Seed (v1.1 TPRM)...');

  // 1. Establish Tenants (Constitutional) — fixed UUIDs for tenant isolation
  const tenantMedshield = await prisma.tenant.create({
    data: { id: TENANT_UUIDS.medshield, name: 'Medshield Health', slug: 'medshield', industry: 'Healthcare', ale_baseline: 1110000000n }
  });
  const tenantVaultbank = await prisma.tenant.create({
    data: { id: TENANT_UUIDS.vaultbank, name: 'Vaultbank NA', slug: 'vaultbank', industry: 'Finance', ale_baseline: 590000000n }
  });
  const tenantGridcore = await prisma.tenant.create({
    data: { id: TENANT_UUIDS.gridcore, name: 'Gridcore Infrastructure', slug: 'gridcore', industry: 'Energy', ale_baseline: 470000000n }
  });
  const tenantProspectPool = await prisma.tenant.create({
    data: {
      id: PROSPECT_POOL_TENANT_ID,
      name: 'Ironframe Prospect Pool',
      slug: 'prospect-pool',
      industry: 'Platform',
      ale_baseline: 0n,
    },
  });

  // 2. Establish Companies (The 1st Party / Tenant Boundary) — each company scoped to one tenant
  const medshield = await prisma.company.create({
    data: { name: 'Medshield Health', sector: 'Healthcare', industry_avg_loss_cents: 1110000000n, infrastructure_val_cents: 1520000000n, tenantId: tenantMedshield.id }
  });

  const vaultbank = await prisma.company.create({
    data: { name: 'Vaultbank NA', sector: 'Finance', industry_avg_loss_cents: 590000000n, infrastructure_val_cents: 4250000000n, tenantId: tenantVaultbank.id }
  });

  const gridcore = await prisma.company.create({
    data: { name: 'Gridcore Infrastructure', sector: 'Energy', industry_avg_loss_cents: 470000000n, infrastructure_val_cents: 2840000000n, tenantId: tenantGridcore.id }
  });

  await prisma.company.create({
    data: {
      name: 'Ironframe Prospect Pool',
      sector: 'Platform',
      industry_avg_loss_cents: 0n,
      infrastructure_val_cents: 0n,
      tenantId: tenantProspectPool.id,
    },
  });

  // 2b. Weekly industry mean ALE snapshots
  const MS_WEEK = 7 * 24 * 60 * 60 * 1000;
  const anchorMs = Date.now();
  const pctVolatileDemo = [88, 90, 92, 94, 96, 98, 100, 125] as const;
  const pctStable = [88, 90, 92, 94, 96, 98, 100, 101] as const;
  const benchmarkRows: Array<{ industry: string; averageAleCents: bigint; timestamp: Date }> = [];
  const pushEightWeeks = (industry: string, baseCents: bigint, pcts: readonly number[]) => {
    for (let i = 0; i < 8; i++) {
      const p = pcts[i]!;
      benchmarkRows.push({
        industry,
        averageAleCents: (baseCents * BigInt(p)) / 100n,
        timestamp: new Date(anchorMs - (7 - i) * MS_WEEK),
      });
    }
  };
  pushEightWeeks('Healthcare', 1_110_000_000n, pctVolatileDemo);
  pushEightWeeks('Finance', 590_000_000n, pctStable);
  pushEightWeeks('Energy', 470_000_000n, pctStable);
  await prisma.marketBenchmarkSnapshot.createMany({ data: benchmarkRows });
  console.log('✅ Market benchmark snapshots (8 weeks × 3 industries).');

  // 3. Inject initial ThreatEvent records (Epic 7 + board baseline)
  // Note: `financialRisk_cents` is BIGINT cents (no floats). Example: 5,000,000 cents = $50,000.
  await prisma.threatEvent.createMany({
    data: [
      // --- Medshield (Healthcare) ---
      {
        title: 'Unauthorized API Egress',
        sourceAgent: 'IRONGATE',
        score: 9,
        targetEntity: 'Medshield Health',
        financialRisk_cents: BigInt(5_000_000),
        tenantCompanyId: medshield.id,
        status: ThreatState.MITIGATED,
        ingestionDetails: JSON.stringify({
          summary: 'Outbound traffic matched restricted egress patterns; quarantine engaged.',
          epic: 7,
        }),
      },
      {
        title: 'Stale MFA Credentials',
        sourceAgent: 'IRONSIGHT',
        score: 7,
        targetEntity: 'Medshield Health',
        financialRisk_cents: BigInt(2_500_000),
        tenantCompanyId: medshield.id,
        status: ThreatState.CONFIRMED,
        ingestionDetails: JSON.stringify({
          summary: 'Stale privileged MFA token detected; active remediation required.',
          epic: 7,
        }),
      },
      {
        title: 'Patient Portal Session Fixation',
        sourceAgent: 'COREINTEL',
        score: 6,
        targetEntity: 'Medshield Health',
        financialRisk_cents: BigInt(1_250_000),
        tenantCompanyId: medshield.id,
        status: ThreatState.CONFIRMED,
      },
      {
        title: 'Unencrypted S3 Export Job',
        sourceAgent: 'IRONTRUST',
        score: 5,
        targetEntity: 'Medshield Health',
        financialRisk_cents: BigInt(900_000),
        tenantCompanyId: medshield.id,
        status: ThreatState.IDENTIFIED,
      },

      // --- Vaultbank (Finance) ---
      {
        title: 'SWIFT Connector Token Reuse',
        sourceAgent: 'IRONGATE',
        score: 8,
        targetEntity: 'Vaultbank NA',
        financialRisk_cents: BigInt(4_000_000),
        tenantCompanyId: vaultbank.id,
        status: ThreatState.CONFIRMED,
      },
      {
        title: 'Privileged Session Anomaly',
        sourceAgent: 'IRONSIGHT',
        score: 7,
        targetEntity: 'Vaultbank NA',
        financialRisk_cents: BigInt(3_100_000),
        tenantCompanyId: vaultbank.id,
        status: ThreatState.CONFIRMED,
      },
      {
        title: 'Legacy TLS Downgrade Attempt',
        sourceAgent: 'COREINTEL',
        score: 6,
        targetEntity: 'Vaultbank NA',
        financialRisk_cents: BigInt(1_800_000),
        tenantCompanyId: vaultbank.id,
        status: ThreatState.IDENTIFIED,
      },
      {
        title: 'Outbound DNS Tunneling Signal',
        sourceAgent: 'IRONGATE',
        score: 9,
        targetEntity: 'Vaultbank NA',
        financialRisk_cents: BigInt(6_500_000),
        tenantCompanyId: vaultbank.id,
        status: ThreatState.CONFIRMED,
      },

      // --- Gridcore (Energy) ---
      {
        title: 'Vendor Supply Chain Breach',
        sourceAgent: 'IRONMAP',
        score: 9,
        targetEntity: 'Gridcore Infrastructure',
        financialRisk_cents: BigInt(5_750_000),
        tenantCompanyId: gridcore.id,
        status: ThreatState.CONFIRMED,
      },
      {
        title: 'ICS Remote Access Misconfiguration',
        sourceAgent: 'IRONSIGHT',
        score: 8,
        targetEntity: 'Gridcore Infrastructure',
        financialRisk_cents: BigInt(4_400_000),
        tenantCompanyId: gridcore.id,
        status: ThreatState.CONFIRMED,
      },
      {
        title: 'Unapproved Firmware Image Detected',
        sourceAgent: 'COREINTEL',
        score: 7,
        targetEntity: 'Gridcore Infrastructure',
        financialRisk_cents: BigInt(2_200_000),
        tenantCompanyId: gridcore.id,
        status: ThreatState.IDENTIFIED,
      },
      {
        title: 'East-West Lateral Movement Signature',
        sourceAgent: 'IRONLOCK',
        score: 8,
        targetEntity: 'Gridcore Infrastructure',
        financialRisk_cents: BigInt(3_600_000),
        tenantCompanyId: gridcore.id,
        status: ThreatState.CONFIRMED,
      },
    ],
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

  // 3. Professional GRC baseline row (non-fictional program anchor)
  await prisma.activeRisk.createMany({
    data: [
      {
        company_id: vaultbank.id,
        title: 'Compliance Audit 2026 — documented control sampling baseline',
        status: 'OPEN',
        score_cents: 0n,
        source: 'GRC_BASELINE',
        isSimulation: false,
      },
    ],
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

  console.log('✅ Ironframe Baseline Seed Complete (Vaultbank NA · Gridcore Infrastructure · Compliance Audit 2026).');

  // --- Sandbox boundary (default dev tenant UUID) — ensures Attbot / simulations always have a Company row ---
  const SANDBOX_TENANT_ID = '00000000-0000-0000-0000-000000000000';
  await prisma.tenant.upsert({
    where: { id: SANDBOX_TENANT_ID },
    update: {},
    create: {
      id: SANDBOX_TENANT_ID,
      name: 'Ironframe Sandbox',
      slug: 'ironframe-sandbox',
      industry: 'Healthcare',
      ale_baseline: 0n,
    },
  });
  const existingSandbox = await prisma.company.findFirst({
    where: { tenantId: SANDBOX_TENANT_ID, name: 'Ironframe Sandbox' },
    select: { id: true },
  });
  if (!existingSandbox) {
    await prisma.company.create({
      data: {
        name: 'Ironframe Sandbox',
        sector: 'Healthcare',
        tenantId: SANDBOX_TENANT_ID,
        industry_avg_loss_cents: 50000000n,
        infrastructure_val_cents: null,
      },
    });
  }
  console.log('✅ Sandbox Company Seeded.');

  await seedSyntheticEmployees(prisma);
  console.log(`✅ Synthetic Shadow Directory Seeded (${SYNTHETIC_SEED_ROW_COUNT} personas).`);

  await prisma.systemConfig.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      stateFreezeActive: false,
    },
  });
  console.log('✅ System config (global) seeded.');

  await prisma.simulationConfig.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      automatedUpdatesEnabled: false,
      targetReadinessScore: 90,
      isCertified: false,
      certifiedAt: null,
      certificateStatus: "IN_PROGRESS",
      certificateIssuedAt: null,
      historicalLowestScore: 100,
      historicalLowestRecordedAt: null,
      simulationStandDownExpiresAtByTenant: {},
    } as any,
  });
  console.log('✅ Simulation config (automated updates secure-by-default).');

  await seedDevGlobalAdminAssignments(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });