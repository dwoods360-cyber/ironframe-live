/**
 * EMERGENCY PURGE SCRIPT — Test data only.
 * Deletes all ThreatEvent and AuditLog records. Safe only in non-production.
 *
 * Usage: npx ts-node scripts/purge-test-data.ts
 * Or:    npm run purge-test-data (if script is added to package.json)
 *
 * THROWS if NODE_ENV === 'production' so it can never run on live data.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[purge-test-data] REFUSED: NODE_ENV is production. This script must never run on live data."
    );
  }

  console.log("[purge-test-data] NODE_ENV is not production — proceeding.");
  console.log("[purge-test-data] Deleting all AuditLog records...");
  const auditResult = await prisma.auditLog.deleteMany({});
  console.log(`[purge-test-data] Deleted ${auditResult.count} AuditLog record(s).`);

  console.log("[purge-test-data] Deleting all ThreatEvent records (WorkNote will cascade)...");
  const threatResult = await prisma.threatEvent.deleteMany({});
  console.log(`[purge-test-data] Deleted ${threatResult.count} ThreatEvent record(s).`);

  // ThreatEvent and AuditLog use @default(cuid()) — no DB sequences to reset.
  // If you add tables with SERIAL/sequences later, reset them here, e.g.:
  // await prisma.$executeRawUnsafe(`SELECT setval('some_table_id_seq', 1);`);
  console.log("[purge-test-data] Done. No sequences to reset (cuid IDs).");
}

main()
  .catch((e) => {
    console.error("[purge-test-data]", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
