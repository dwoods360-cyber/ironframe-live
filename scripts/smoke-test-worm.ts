/**
 * Epic 12 WORM scratchpad — adversarial delete vs audited triage bypass.
 * Run: npx tsx scripts/smoke-test-worm.ts
 *
 * Prerequisite (migration already on disk — do not re-run --name):
 *   npx prisma migrate deploy
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient, ThreatState, type Prisma } from "@prisma/client";

import {
  assertThreatEventWormMutationPermitted,
  EPIC_12_THREAT_EVENT_WORM_VIOLATION_MESSAGE,
} from "@/app/lib/evidence/threatEventWormGuard.server";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env"), override: true });

process.env.IRONFRAME_WORM_THREAT_EVENT_ENFORCED = "1";

const TEST_THREAT_ID = "test-worm-evt-999";
const MEDSHIELD_TENANT = "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01";

const prisma = new PrismaClient();

async function withThreatEventWormBypass<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.worm_threat_event_bypass', '1', true)`;
    return fn(tx);
  });
}

async function withThreatEventWormEnforced<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.worm_threat_event_enforced', '1', true)`;
    return fn(tx);
  });
}

function messageIncludesComplianceViolation(message: string): boolean {
  return message.includes(EPIC_12_THREAT_EVENT_WORM_VIOLATION_MESSAGE);
}

async function runSmokeTest(): Promise<void> {
  console.log("Initializing WORM Security Verification Test...\n");

  await withThreatEventWormBypass(async (tx) => {
    await tx.threatEvent.deleteMany({ where: { id: TEST_THREAT_ID } }).catch(() => undefined);
  });

  const company = await prisma.company.findFirst({
    where: { tenantId: MEDSHIELD_TENANT },
    orderBy: { id: "asc" },
    select: { id: true, name: true },
  });
  if (!company) {
    throw new Error(`No Company for tenant ${MEDSHIELD_TENANT}. Run prisma/seed.ts first.`);
  }

  const testThreat = await prisma.threatEvent.create({
    data: {
      id: TEST_THREAT_ID,
      title: "WORM smoke: simulated perimeter anomaly",
      sourceAgent: "worm-smoke-test",
      score: 72,
      targetEntity: "perimeter-edge-01",
      status: ThreatState.IDENTIFIED,
      tenantCompanyId: company.id,
      financialRisk_cents: 50_000n,
      ingestionDetails: JSON.stringify({
        wormSmokeTest: true,
        description: "Simulated perimeter anomaly",
        mitigationNotes: "Awaiting review",
      }),
    },
    select: { id: true, status: true },
  });
  console.log(`Step 1: Base log record generated successfully (ID: ${testThreat.id})`);

  console.log("\nStep 2a: Prisma query-extension guard (unwrapped delete action)...");
  let step2aPass = false;
  try {
    assertThreatEventWormMutationPermitted("delete");
    console.error("FAILURE: Prisma guard allowed an unwrapped delete action.");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (messageIncludesComplianceViolation(message)) {
      console.log("SUCCESS: Prisma extension blocked the direct delete action.");
      console.log(`Caught Exception: "${EPIC_12_THREAT_EVENT_WORM_VIOLATION_MESSAGE}"`);
      step2aPass = true;
    } else {
      console.error(`FAILURE: Unexpected Prisma guard message:\n${message}`);
    }
  }

  console.log("\nStep 2b: PostgreSQL BEFORE DELETE trigger (enforced session, no bypass)...");
  let step2bPass = false;
  try {
    await withThreatEventWormEnforced(async (tx) => {
      await tx.threatEvent.delete({ where: { id: testThreat.id } });
    });
    console.error("FAILURE: Raw deletion passed through Postgres trigger enforcement.");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (messageIncludesComplianceViolation(message)) {
      console.log("SUCCESS: Postgres trigger intercepted the direct deletion request!");
      console.log(`Caught Exception: "${EPIC_12_THREAT_EVENT_WORM_VIOLATION_MESSAGE}"`);
      step2bPass = true;
    } else {
      console.error(`FAILURE: Unexpected Postgres trigger message:\n${message}`);
    }
  }

  console.log("\nStep 3: Audited bypass channel (same contract as updateThreatWithIntegrity)...");
  let step3Pass = false;
  try {
    const updatedRecord = await withThreatEventWormBypass(async (tx) => {
      console.info(
        `[WORM AUDITED BYPASS] ThreatEvent ${testThreat.id} via WORM_SMOKE_TRIAGE_MITIGATED`,
      );
      return tx.threatEvent.update({
        where: { id: testThreat.id },
        data: {
          status: ThreatState.MITIGATED,
          ingestionDetails: JSON.stringify({
            wormSmokeTest: true,
            resolutionSummary:
              "Isolated via automated micro-segmentation firewall rule (Verified via Human-In-The-Loop)",
          }),
        },
        select: { id: true, status: true },
      });
    });
    console.log("SUCCESS: Audited bypass updated the lifecycle state cleanly.");
    console.log(`New Status In DB: [${updatedRecord.status}]`);
    step3Pass = updatedRecord.status === ThreatState.MITIGATED;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`FAILURE: Audited bypass threw an unexpected error: ${message}`);
  }

  console.log("\nCleaning up test assets via authorized bypass channel...");
  await withThreatEventWormBypass(async (tx) => {
    await tx.threatEvent.delete({ where: { id: testThreat.id } });
  });
  console.log("Scratchpad environment sanitized.");

  console.log("\n--- WORM smoke summary ---");
  console.log(`Step 2a (Prisma guard):     ${step2aPass ? "PASS" : "FAIL"}`);
  console.log(`Step 2b (Postgres trigger): ${step2bPass ? "PASS" : "FAIL"}`);
  console.log(`Step 3 (audited bypass):    ${step3Pass ? "PASS" : "FAIL"}`);

  if (!step2aPass || !step2bPass || !step3Pass) {
    process.exitCode = 1;
  }
}

runSmokeTest()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
