/**
 * Track A — seeds production-style AuditLog rows for Irontally `?readiness=1` smoke tests.
 * Run: npm run db:seed:auditor-readiness
 */
import "dotenv/config";

import { PrismaClient } from "@prisma/client";

import {
  compileReadinessFromLogRows,
  IRONTALLY_EVIDENCE_AUDIT_ACTIONS,
} from "@/src/services/compliance/irontallyReadinessCore";

const DEFAULT_TENANT = "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is missing. Set it in .env.local before running this script.");
  }

  const tenantId = (process.env.AUDITOR_READINESS_TENANT_ID ?? DEFAULT_TENANT).trim();
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true },
  });
  if (!tenant) {
    throw new Error(`Tenant ${tenantId} not found. Run npm run db:seed or set AUDITOR_READINESS_TENANT_ID.`);
  }

  const busJustification =
    "Multi-agent bus cycle completed. 8 specialist log lines. Ironquery fingerprint: iq-track-a-smoke. Irongate DMZ ingress validated.";

  const seeds: Array<{ action: string; justification: string }> = [
    { action: "ORCHESTRATION_BUS_CYCLE_SUCCESS", justification: busJustification },
    {
      action: "IRONSIGHT_REGULATORY_POLL",
      justification: "Ironsight regulatory horizon poll completed for tenant readiness attestation.",
    },
    {
      action: "SUSTAINABILITY_GRIDCORE_POLL_EXECUTED",
      justification: "Ironscribe Gridcore carbon sync — sustainability telemetry sealed for CSRD ESRS.",
    },
  ];

  for (const row of seeds) {
    await prisma.auditLog.create({
      data: {
        action: row.action,
        operatorId: "TRACK_A_SEED",
        tenantId,
        governance_tenant_uuid: tenantId,
        justification: row.justification,
        isSimulation: false,
      },
    });
  }

  const activeLogs = await prisma.auditLog.findMany({
    where: {
      tenantId,
      isSimulation: false,
      action: { in: [...IRONTALLY_EVIDENCE_AUDIT_ACTIONS] },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      action: true,
      threatId: true,
      justification: true,
      createdAt: true,
    },
  });

  const readiness = compileReadinessFromLogRows(activeLogs);
  const summary = readiness.map((r) => ({
    framework: r.framework,
    passing: r.passingControlsCount,
    total: r.totalControlsMonitored,
    evidenceRows: r.verifiedEvidenceLogs.length,
  }));

  console.log(`✅ AuditLog telemetry seeded for tenant "${tenant.name}" (${tenantId})`);
  console.log(`   Ledger rows (evidence actions): ${activeLogs.length}`);
  console.log("   Readiness summary:", JSON.stringify(summary, null, 2));

  const nonZero = readiness.filter((r) => r.passingControlsCount > 0);
  if (nonZero.length === 0) {
    console.warn("⚠️  Readiness compiler returned zero passing controls — check AuditLog actions vs directive map.");
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
