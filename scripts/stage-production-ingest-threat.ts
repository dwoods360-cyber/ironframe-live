/**
 * Stage an IDENTIFIED ThreatEvent on the live Supabase project for production ingest smoke tests.
 * Run: npx tsx scripts/stage-production-ingest-threat.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient, ThreatState } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env.production.local") });
config({ path: resolve(process.cwd(), ".env") });

const MEDSHIELD_TENANT = "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01";
const PRODUCTION_INGEST_THREAT_ID = "cmouerday000357xc47kbd6p7";

async function main() {
  const dbUrl =
    process.env.DATABASE_URL_ADMIN?.trim() ||
    process.env.DIRECT_URL?.trim() ||
    process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    throw new Error("Set DATABASE_URL / DIRECT_URL in .env.local before staging.");
  }

  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  try {
    const company = await prisma.company.findFirst({
      where: { tenantId: MEDSHIELD_TENANT, isTestRecord: false },
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    const companyId =
      company?.id ??
      (
        await prisma.company.findFirst({
          where: { tenantId: MEDSHIELD_TENANT },
          orderBy: { id: "asc" },
          select: { id: true },
        })
      )?.id;
    if (companyId == null) {
      throw new Error(`No Company for Medshield tenant ${MEDSHIELD_TENANT}. Run prisma/seed.ts first.`);
    }

    const ingestionDetails = JSON.stringify({
      source: "aws-vulnerability-scanner",
      telemetryType: "VULNERABILITY",
      severity: "CRITICAL",
      findings: 1,
      tenantContext: "Medshield",
      stagedForProductionIngest: true,
      stagedAt: new Date().toISOString(),
    });

    await prisma.threatEvent.deleteMany({ where: { id: PRODUCTION_INGEST_THREAT_ID } }).catch(() => undefined);

    const row = await prisma.threatEvent.create({
      data: {
        id: PRODUCTION_INGEST_THREAT_ID,
        title: "PROD-SMOKE: AWS CRITICAL vulnerability (cloud pipeline sync)",
        sourceAgent: "Irongate-AWS",
        score: 9,
        targetEntity: "medshield-prod-ingress-bus",
        financialRisk_cents: BigInt(1_110_000_000),
        status: ThreatState.IDENTIFIED,
        ttlSeconds: 259200,
        tenantCompanyId: companyId,
        ingestionDetails,
      },
    });

    console.log("✅ Staged production ingest threat:", row.id);
    console.log("   tenant company:", company?.name ?? companyId.toString());
    console.log("   status:", row.status);
    console.log("   financialRisk_cents:", row.financialRisk_cents.toString());
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("❌ Stage failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
