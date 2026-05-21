/**
 * Forensic seed: 8 weekly MarketBenchmarkSnapshot rows (7-day spacing, ending today)
 * with a 25% week-over-week spike on the final point (ΔV = 0.25 → volatility alert).
 *
 * Industry: first tenant's `industry` if set, else env BENCHMARK_SEED_INDUSTRY, else "Software/SaaS".
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MS_WEEK = 7 * 24 * 60 * 60 * 1000;

/** $9.5M in integer cents */
const WEEK1_CENTS = 950_000_000n;
/** Week 7 — exactly $10M */
const WEEK7_CENTS = 1_000_000_000n;
/** Week 8 (today) — $12.5M → 25% above week 7 */
const WEEK8_CENTS = 1_250_000_000n;

function buildStableGrowthSixWeeks(): bigint[] {
  const out: bigint[] = [];
  let v = WEEK1_CENTS;
  for (let i = 0; i < 6; i++) {
    out.push(v);
    if (i < 5) {
      v = (v * 101n) / 100n;
    }
  }
  return out;
}

async function resolveIndustry(): Promise<string> {
  const fromEnv = process.env.BENCHMARK_SEED_INDUSTRY?.trim();
  if (fromEnv) return fromEnv;

  const tenant = await prisma.tenant.findFirst({
    orderBy: { createdAt: "asc" },
    select: { industry: true },
  });
  const fromTenant = tenant?.industry?.trim();
  if (fromTenant) return fromTenant;

  return "Software/SaaS";
}

async function main() {
  const industry = await resolveIndustry();
  const anchor = new Date();
  anchor.setUTCHours(12, 0, 0, 0);

  const weeks1to6 = buildStableGrowthSixWeeks();
  const averageAleCents = [...weeks1to6, WEEK7_CENTS, WEEK8_CENTS];

  if (averageAleCents.length !== 8) {
    throw new Error(`Expected 8 data points, got ${averageAleCents.length}`);
  }

  const data = averageAleCents.map((cents, i) => ({
    industry,
    averageAleCents: cents,
    timestamp: new Date(anchor.getTime() - (7 - i) * MS_WEEK),
  }));

  const { count: removed } = await prisma.marketBenchmarkSnapshot.deleteMany({
    where: { industry },
  });
  if (removed > 0) {
    console.log(`Removed ${removed} existing snapshot(s) for industry "${industry}".`);
  }

  const { count } = await prisma.marketBenchmarkSnapshot.createMany({ data });
  console.log(
    `✅ MarketBenchmarkSnapshot: inserted ${count} row(s) for "${industry}" ` +
      `(8 weeks ending ${anchor.toISOString().slice(0, 10)}; final spike 25% WoW).`,
  );
  console.log("   Cents series:", averageAleCents.map((c) => c.toString()).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
