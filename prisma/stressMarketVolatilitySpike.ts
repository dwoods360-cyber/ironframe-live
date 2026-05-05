/**
 * Omni-seed: 8 sectors, distinct Week-7 means + Week-8 WoW 21%-29% (volatility alert).
 *
 * Run: npm run db:seed:omni   (or npx tsx prisma/stressMarketVolatilitySpike.ts)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { targetIndustries } from "@/app/utils/omniBenchmarkIndustries";

const prisma = new PrismaClient();
const MS_WEEK = 7 * 24 * 60 * 60 * 1000;

const INDUSTRIES = targetIndustries;

const LEGACY_OMNI_INDUSTRIES = ["SaaS", "Manufacturing", "Energy", "Retail"] as const;

/** Week-7 mean ALE (cents) before WoW spike — aligns with UI dropdown + geopolitical tiers. */
const SECTOR_PRIOR_CENTS: Record<(typeof INDUSTRIES)[number], bigint> = {
  Defense: 2_500_000_000n,
  "Federal Government": 2_000_000_000n,
  Aerospace: 1_700_000_000n,
  "State & Local": 1_100_000_000n,
  "Public Sector": 1_500_000_000n,
  Healthcare: 1_210_000_000n,
  Finance: 1_800_000_000n,
  Technology: 950_000_000n,
};

/** WoW surge for Week 8 vs Week 7: 21% .. 29% inclusive (always above 20% alert threshold). */
function randomSurgePercent(): number {
  return 21 + Math.floor(Math.random() * 9);
}

function spikeCentsFromPrior(priorCents: bigint, surgePct: number): bigint {
  return (priorCents * BigInt(100 + surgePct)) / 100n;
}

function weeklyAleSeriesForSector(priorCents: bigint, spikeCents: bigint): bigint[] {
  const floor = (priorCents * 8n) / 10n;
  const out: bigint[] = [];
  for (let i = 0; i < 6; i++) {
    const step = (BigInt(i) * (priorCents - floor)) / 5n;
    out.push(floor + step);
  }
  out.push(priorCents);
  out.push(spikeCents);
  return out;
}

async function main() {
  const anchor = new Date();
  anchor.setUTCHours(12, 0, 0, 0);

  const oldestTs = new Date(anchor.getTime() - 7 * MS_WEEK);

  await prisma.marketBenchmarkSnapshot.deleteMany({
    where: {
      industry: { in: [...INDUSTRIES, ...LEGACY_OMNI_INDUSTRIES] },
      timestamp: { gte: oldestTs, lte: anchor },
    },
  });

  const rows: { industry: string; averageAleCents: bigint; timestamp: Date }[] = [];

  for (const industry of INDUSTRIES) {
    const priorCents = SECTOR_PRIOR_CENTS[industry];
    const surgePct = randomSurgePercent();
    const spikeCents = spikeCentsFromPrior(priorCents, surgePct);
    const series = weeklyAleSeriesForSector(priorCents, spikeCents);

    for (let w = 0; w < 8; w++) {
      const ts = new Date(anchor.getTime() - (7 - w) * MS_WEEK);
      rows.push({
        industry,
        averageAleCents: series[w]!,
        timestamp: ts,
      });
    }

    console.log(
      `   ${industry}: Week7=${priorCents.toString()} -> Week8=${spikeCents.toString()} (WoW +${surgePct}%)`,
    );
  }

  await prisma.marketBenchmarkSnapshot.createMany({ data: rows });

  console.log(`Inserted ${rows.length} snapshots (${INDUSTRIES.length} sectors x 8 weeks).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
