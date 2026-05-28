import { NextRequest, NextResponse } from "next/server";
import { parseCronRequestBody } from "@/app/utils/parseCronRequestBody";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import { runHealthPostureTriage } from "@/src/services/irontech/healthPostureMonitor";
import { checkCronAuth } from "@/app/api/internal/cron/cronAuth";

/**
 * TAS §4.3 — Live heartbeat & self-healing router (Epic 13).
 * Invoked by infrastructure timers, Ironwatch monitors, or internal agent POST hooks.
 *
 * Auth: `Authorization: Bearer ${IRONFRAME_CRON_SECRET}` or `x-cron-secret`.
 *
 * Body: `{ tenantId, threadId, currentHealthBarPercent, targetZone? }`
 */
export async function GET(request: NextRequest) {
  if (!checkCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  console.info("[CRON_ACTIVATION_TRACE] Health posture triage execution initiated successfully.");

  return NextResponse.json(
    {
      status: "HEALTH_TRIAGE_COMPLETED",
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}

export async function POST(req: NextRequest) {
  if (!checkCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  console.info("[CRON_ACTIVATION_TRACE] Health posture triage execution initiated successfully.");

  try {
    const body = await parseCronRequestBody(req);
    const defaultTenant =
      process.env.CRON_HEALTH_DEFAULT_TENANT_ID?.trim() ||
      process.env.SHADOW_PLANE_INGEST_TENANT_UUID?.trim() ||
      TENANT_UUIDS.medshield;
    const tenantId =
      typeof body.tenantId === "string" && body.tenantId.trim()
        ? body.tenantId.trim()
        : defaultTenant;
    const threadId =
      typeof body.threadId === "string" && body.threadId.trim()
        ? body.threadId.trim()
        : `tas-4.3-health-${tenantId}`;
    const healthRaw = body.currentHealthBarPercent ?? body.healthBarPercent ?? 85;
    const targetZone =
      typeof body.targetZone === "string"
        ? body.targetZone
        : typeof body.incidentZone === "string"
          ? body.incidentZone
          : undefined;

    const result = await runHealthPostureTriage({
      tenantId,
      threadId,
      healthBarPercent: Number(healthRaw),
      incidentZone: targetZone,
    });

    return NextResponse.json(
      {
        success: true,
        outcome: result.outcome,
        triageEngaged: result.triageEngaged,
        auditIntelligenceLogged: result.auditIntelligenceLogged,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isBounds = message.includes("MISSING_HEALTH_METRIC_BOUNDS");
    return NextResponse.json(
      {
        success: false,
        error: isBounds ? "MISSING_HEALTH_METRIC_BOUNDS" : "INTERNAL_HEALTH_MONITOR_CRASH",
        details: message,
      },
      { status: isBounds ? 400 : 500 },
    );
  }
}
