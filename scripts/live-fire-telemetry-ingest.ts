/**
 * Live-fire: Irongate telemetry envelope → POST /api/threats/ingest → sovereign bus → AuditLog / Irontally evidence.
 * Run: npx tsx scripts/live-fire-telemetry-ingest.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

process.env.GOOGLE_API_KEY =
  process.env.GOOGLE_API_KEY?.trim() ||
  process.env.GEMINI_API_KEY?.trim() ||
  "";
process.env.SHADOW_PLANE_ACTIVE = process.env.SHADOW_PLANE_ACTIVE ?? "1";

const MEDSHIELD_TENANT = "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01";
const ALERT_ID = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d";

/** Canonical TelemetryIngress envelope (Irongate `ExternalPayloadSchema` + AWS vuln mock). */
const TELEMETRY_INGRESS = {
  source: "AWS",
  timestamp: "2026-05-21T16:00:00Z",
  alertId: ALERT_ID,
  affectedAssets: ["medshield-prod-ingress-bus"],
  telemetryType: "VULNERABILITY",
  payload: {
    details: { cve: "CVE-2026-9999", severity: "CRITICAL" },
    exposureFactor: 0.85,
    assetValueCents: 1110000000,
  },
  /** Ironscribe sovereign bus requires narrative text for Gemini structured extraction. */
  text:
    "CONFIDENTIAL AWS GUARDDUTY: Medshield (Tenant Type: MEDSHIELD) ingress-bus vulnerability CVE-2026-9999 CRITICAL on medshield-prod-ingress-bus. " +
    "Total liability exposure $11,100,000.00. Vendor ID 550e8400-e29b-41d4-a716-446655440000. Exposure factor 0.85.",
} as const;

function maskSecret(value: string | undefined): string {
  const v = value?.trim() ?? "";
  if (!v) return "(missing)";
  if (v.length <= 8) return "****";
  return `${v.slice(0, 4)}…${v.slice(-4)} (${v.length} chars)`;
}

async function preflight(): Promise<void> {
  console.log("=== Environment pre-flight ===");
  const db = process.env.DATABASE_URL?.trim();
  const google = process.env.GOOGLE_API_KEY?.trim();
  console.log("  .env.local loaded:", Boolean(db));
  console.log("  DATABASE_URL:", db ? "mapped" : "MISSING");
  console.log("  GOOGLE_API_KEY:", google ? maskSecret(google) : "MISSING (GEMINI fallback also empty)");
  console.log("  SHADOW_PLANE_ACTIVE:", process.env.SHADOW_PLANE_ACTIVE);
  console.log("  IRONFRAME_INGEST_BUS_DISABLED:", process.env.IRONFRAME_INGEST_BUS_DISABLED ?? "(unset)");
  if (!db) throw new Error("DATABASE_URL is required in .env.local");
  if (!google) {
    throw new Error("GOOGLE_API_KEY or GEMINI_API_KEY is required for the sovereign orchestration bus.");
  }
  if (process.env.IRONFRAME_INGEST_BUS_DISABLED?.trim() === "1") {
    throw new Error("IRONFRAME_INGEST_BUS_DISABLED=1 — unset to exercise the live bus.");
  }
}

async function ensureIdentifiedThreat(prisma: PrismaClient): Promise<void> {
  const company = await prisma.company.findFirst({
    where: { tenantId: MEDSHIELD_TENANT, isTestRecord: false },
    orderBy: { id: "asc" },
    select: { id: true },
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
    throw new Error(`No Company row for Medshield tenant ${MEDSHIELD_TENANT}. Run npm run db:seed.`);
  }

  const ingestionDetails = JSON.stringify({
    ...TELEMETRY_INGRESS,
    irongateValidatedAt: new Date().toISOString(),
    liveFireEpic: "telemetry-ingest",
  });

  await prisma.threatEvent.deleteMany({ where: { id: ALERT_ID } }).catch(() => undefined);

  await prisma.threatEvent.create({
    data: {
      id: ALERT_ID,
      title: "LIVE-FIRE: CVE-2026-9999 medshield-prod-ingress-bus",
      sourceAgent: "Irongate-AWS",
      score: 9,
      targetEntity: "medshield-prod-ingress-bus",
      financialRisk_cents: BigInt(1_110_000_000),
      status: "IDENTIFIED",
      ttlSeconds: 259200,
      tenantCompanyId: companyId,
      ingestionDetails,
    },
  });
  console.log("  ThreatEvent staged:", ALERT_ID, "status=IDENTIFIED");
}

async function main() {
  await preflight();

  console.log("\n=== Irongate DMZ validation ===");
  const { irongateSanitize } = await import("@/src/services/agents/irongateSanitize");
  const sanitized = await irongateSanitize({
    tenant_id: MEDSHIELD_TENANT,
    source_type: "API",
    raw_data: { ...TELEMETRY_INGRESS },
  });
  console.log("  Irongate status: CLEAN");
  console.log("  tenant stamp:", sanitized.tenant_id);

  const prisma = new PrismaClient();
  try {
    await ensureIdentifiedThreat(prisma);

    console.log("\n=== POST /api/threats/ingest (skipOrchestrationBus=false) ===");
    const baseUrl = (process.env.LIVE_FIRE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

    const ingestBody = {
      threatId: ALERT_ID,
      tenantId: MEDSHIELD_TENANT,
      operatorId: "LIVE_FIRE_TELEMETRY",
      sourceAgent: "GRC_BOT",
      skipOrchestrationBus: false,
      rawData: { ...TELEMETRY_INGRESS, ...sanitized },
      healthBarPercent: 85,
      justification:
        "Live-fire telemetry ingest: Irongate-validated AWS VULNERABILITY signal for medshield-prod-ingress-bus; orchestration bus attestation required.",
    };

    let res: Response;
    try {
      res = await fetch(`${baseUrl}/api/threats/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": MEDSHIELD_TENANT,
          "x-shadow-plane-active": "1",
        },
        body: JSON.stringify(ingestBody),
      });
    } catch (fetchErr) {
      throw new Error(
        `Could not reach ${baseUrl}/api/threats/ingest — start the app with "npm run dev" (or set LIVE_FIRE_BASE_URL). ${fetchErr instanceof Error ? fetchErr.message : fetchErr}`,
      );
    }

    const rawText = await res.text();
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      throw new Error(
        `Non-JSON ingest response (${res.status}): ${rawText.slice(0, 240)}… — ensure "npm run dev" is running and middleware shadow-plane bypass is active.`,
      );
    }
    console.log("  HTTP status:", res.status);
    console.log("  Response:", JSON.stringify(json, null, 2));

    if (res.status !== 200 || json.success !== true) {
      throw new Error(`Ingest failed: ${res.status} ${JSON.stringify(json)}`);
    }

    console.log("\n=== AuditLog verification (Medshield) ===");
    const since = new Date(Date.now() - 120_000);
    const busRows = await prisma.auditLog.findMany({
      where: {
        tenantId: MEDSHIELD_TENANT,
        isSimulation: false,
        action: "ORCHESTRATION_BUS_CYCLE_SUCCESS",
        operatorId: "SYSTEM_ORCHESTRATOR_BUS",
        threatId: ALERT_ID,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        action: true,
        operatorId: true,
        threatId: true,
        justification: true,
        createdAt: true,
      },
    });

    if (busRows.length === 0) {
      const recent = await prisma.auditLog.findMany({
        where: {
          tenantId: MEDSHIELD_TENANT,
          action: "ORCHESTRATION_BUS_CYCLE_SUCCESS",
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, operatorId: true, threatId: true, createdAt: true },
      });
      console.log("  Recent bus rows (any threat):", recent);
      throw new Error("No live ORCHESTRATION_BUS_CYCLE_SUCCESS AuditLog for this threat in the last 2 minutes.");
    }

    console.log("  Live bus evidence row(s):", busRows);

    const { compileReadinessFromLogRows, IRONTALLY_EVIDENCE_AUDIT_ACTIONS } = await import(
      "@/src/services/compliance/irontallyReadinessCore"
    );
    const evidenceLogs = await prisma.auditLog.findMany({
      where: {
        tenantId: MEDSHIELD_TENANT,
        isSimulation: false,
        action: { in: [...IRONTALLY_EVIDENCE_AUDIT_ACTIONS] },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        action: true,
        threatId: true,
        operatorId: true,
        createdAt: true,
        justification: true,
      },
    });
    const readiness = compileReadinessFromLogRows(evidenceLogs);
    console.log("\n=== Irontally evidence compiler (readiness snapshot) ===");
    for (const fw of readiness) {
      console.log(
        `  ${fw.framework}: ${fw.passingControlsCount}/${fw.totalControlsMonitored} controls — evidence rows: ${fw.verifiedEvidenceLogs.length}`,
      );
    }

    console.log("\n✅ LIVE-FIRE GREENLIT: Irongate → ingest API → sovereign bus → AuditLog evidence path verified.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("\n❌ LIVE-FIRE FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
});
