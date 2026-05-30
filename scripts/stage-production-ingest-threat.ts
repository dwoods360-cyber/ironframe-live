/**
 * Stage an IDENTIFIED ThreatEvent on the live Supabase project for production ingest smoke tests.
 * Run: npx tsx scripts/stage-production-ingest-threat.ts
 *
 * Compliance-only frame (no CVE/vulnerability tokens — routes Irontally → Ironlogic):
 *   STAGE_COMPLIANCE_FRAME=1 npx tsx scripts/stage-production-ingest-threat.ts
 *
 * Full live loop: node scripts/production-compliance-ingest-probe.mjs
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

    const complianceFrame = process.env.STAGE_COMPLIANCE_FRAME?.trim() === "1";
    const ingestionDetails = JSON.stringify(
      complianceFrame
        ? {
            source: "GRC_COMPLIANCE_STREAM",
            telemetryType: "COMPLIANCE",
            contentTag: "CSRD-2026-COMPLIANCE",
            payloadContent: "CSRD-2026-COMPLIANCE",
            tenantContext: "Medshield",
            stagedForProductionIngest: true,
            stagedAt: new Date().toISOString(),
          }
        : {
            source: "aws-vulnerability-scanner",
            telemetryType: "VULNERABILITY",
            severity: "CRITICAL",
            findings: 1,
            tenantContext: "Medshield",
            stagedForProductionIngest: true,
            stagedAt: new Date().toISOString(),
          },
    );

    await prisma.threatEvent.deleteMany({ where: { id: PRODUCTION_INGEST_THREAT_ID } }).catch(() => undefined);

    const row = await prisma.threatEvent.create({
      data: {
        id: PRODUCTION_INGEST_THREAT_ID,
        title: complianceFrame
          ? "PROD-SMOKE: CSRD compliance framework mapping (Ironlogic RLS)"
          : "PROD-SMOKE: AWS CRITICAL vulnerability (cloud pipeline sync)",
        sourceAgent: complianceFrame ? "GRC_BOT" : "Irongate-AWS",
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
    console.log("   frame:", complianceFrame ? "COMPLIANCE (CSRD / Ironlogic)" : "CVE (Ironsight)");
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
