/**
 * Iteration 3.2: 100-Company Scale Benchmark — Enterprise Seed Script.
 * Clean slate (tenant deleteMany), then 1 Benchmark Tenant, 100 Companies, 500 ActiveRisks.
 * BigInt score_cents and random severities (CRITICAL, HIGH, MED, LOW).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BENCHMARK_TENANT_NAME = 'OmniCorp Global';
const BENCHMARK_SLUG = 'omnicorp-global';
const COMPANY_COUNT = 100;
const RISKS_PER_COMPANY = 5;
const TOTAL_RISKS = COMPANY_COUNT * RISKS_PER_COMPANY;

const SEVERITIES = ['CRITICAL', 'HIGH', 'MED', 'LOW'] as const;
const SECTORS = ['Healthcare', 'Finance', 'Technology', 'Energy', 'Defense'] as const;
const SOURCES = ['GRCBOT', 'KIMBOT', 'COREINTEL', 'IRONSIGHT', 'Manual'] as const;

function randomSeverity(): (typeof SEVERITIES)[number] {
  return SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)];
}

function randomBigIntScoreCents(): bigint {
  return BigInt(Math.floor(Math.random() * 10_000_000_000));
}

async function main() {
  console.log('[perf-test-seed] Clean slate: tenant.deleteMany({})...');
  await prisma.tenant.deleteMany({});
  console.log('[perf-test-seed] Slate clean.');

  console.log(`[perf-test-seed] Creating benchmark tenant "${BENCHMARK_TENANT_NAME}"...`);
  const tenant = await prisma.tenant.create({
    data: {
      name: BENCHMARK_TENANT_NAME,
      slug: BENCHMARK_SLUG,
      industry: 'Benchmark',
      ale_baseline: BigInt(0),
    },
  });
  console.log(`[perf-test-seed] Tenant created: ${tenant.id}`);

  console.log(`[perf-test-seed] Creating ${COMPANY_COUNT} companies...`);
  for (let i = 0; i < COMPANY_COUNT; i++) {
    await prisma.company.create({
      data: {
        name: `OmniCorp Company ${i + 1}`,
        sector: SECTORS[i % SECTORS.length],
        tenantId: tenant.id,
        industry_avg_loss_cents: BigInt(Math.floor(Math.random() * 500_000_000)),
      },
    });
  }
  const companies = await prisma.company.findMany({
    where: { tenantId: tenant.id },
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  if (companies.length !== COMPANY_COUNT) {
    throw new Error(`Expected ${COMPANY_COUNT} companies, got ${companies.length}`);
  }
  console.log(`[perf-test-seed] ${companies.length} companies created.`);

  console.log(`[perf-test-seed] Creating ${TOTAL_RISKS} ActiveRisks (${RISKS_PER_COMPANY} per company)...`);
  let riskCount = 0;
  for (let c = 0; c < companies.length; c++) {
    const companyId = companies[c].id;
    for (let r = 0; r < RISKS_PER_COMPANY; r++) {
      await prisma.activeRisk.create({
        data: {
          company_id: companyId,
          title: `Benchmark Risk ${riskCount + 1} — ${randomSeverity()}`,
          status: randomSeverity(),
          score_cents: randomBigIntScoreCents(),
          source: SOURCES[riskCount % SOURCES.length],
          isSimulation: false,
        },
      });
      riskCount++;
    }
  }
  console.log(`[perf-test-seed] ${riskCount} ActiveRisks created.`);

  console.log('\n--- BENCHMARK TENANT ID (use for latency test) ---');
  console.log(tenant.id);
  console.log('------------------------------------------------\n');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
