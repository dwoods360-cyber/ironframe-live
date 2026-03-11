/**
 * EMERGENCY DB PURGE — Test data only (GATEKEEPER PROTOCOL).
 * Clears AuditLog and ThreatEvent to resolve E2E race conditions.
 *
 * Run: npx ts-node scripts/nuke-test-data.ts
 * Or:  npx tsx scripts/nuke-test-data.ts
 *
 * CRITICAL: Throws if NODE_ENV === 'production'. Never run on live data.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("CRITICAL: CANNOT NUKE PRODUCTION");
  }

  console.log("[nuke-test-data] Deleting all AuditLog records...");
  const auditResult = await prisma.auditLog.deleteMany({});
  console.log(`[nuke-test-data] Deleted ${auditResult.count} AuditLog record(s).`);

  console.log("[nuke-test-data] Deleting all ThreatEvent records...");
  const threatResult = await prisma.threatEvent.deleteMany({});
  console.log(`[nuke-test-data] Deleted ${threatResult.count} ThreatEvent record(s).`);

  console.log("DATABASE PURGE COMPLETE: ENVIRONMENT DETERMINISTIC.");
}

main()
  .catch((e) => {
    console.error("[nuke-test-data]", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
