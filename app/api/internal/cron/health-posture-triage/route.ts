import { NextResponse } from "next/server";
import { parseCronRequestBody } from "@/app/utils/parseCronRequestBody";
import { runHealthPostureTriage } from "@/src/services/irontech/healthPostureMonitor";
import {
  checkCronBearerAuth,
  cronBearerUnauthorizedResponse,
} from "@/app/api/internal/cron/cronAuth";
import { flattenCronTenantRuns } from "@/app/api/internal/cron/cronRouteShell";
import {
  readExplicitCronTenantId,
  resolveCronTenantIds,
} from "@/app/lib/server/cronTenantScope";

/**
 * TAS §4.3 — Live heartbeat & self-healing router (Epic 13).
 * Schedule: every 30 minutes (Vercel Cron).
 * Auth: `Authorization: Bearer ${IRONFRAME_CRON_SECRET}`.
 */
async function handleCron(request: Request) {
  if (!checkCronBearerAuth(request)) {
    return cronBearerUnauthorizedResponse();
  }
  console.info("[CRON_ACTIVATION_TRACE] Health posture triage execution initiated successfully.");

  try {
    const body = await parseCronRequestBody(request);
    const bodyTenantId =
      typeof body.tenantId === "string" && body.tenantId.trim() ? body.tenantId.trim() : null;
    const tenantIds = await resolveCronTenantIds(
      readExplicitCronTenantId(request, bodyTenantId ?? process.env.CRON_HEALTH_DEFAULT_TENANT_ID),
    );
    const threadHint =
      typeof body.threadId === "string" && body.threadId.trim() ? body.threadId.trim() : null;
    const healthRaw = body.currentHealthBarPercent ?? body.healthBarPercent ?? 85;
    const targetZone =
      typeof body.targetZone === "string"
        ? body.targetZone
        : typeof body.incidentZone === "string"
          ? body.incidentZone
          : undefined;

    const runs: Array<Record<string, unknown>> = [];
    for (const tenantId of tenantIds) {
      const threadId = threadHint ?? `tas-4.3-health-${tenantId}`;
      const result = await runHealthPostureTriage({
        tenantId,
        threadId,
        healthBarPercent: Number(healthRaw),
        incidentZone: targetZone,
      });

      console.info(
        "[epic13-telemetry-triage]",
        JSON.stringify({
          tenantId,
          threadId,
          healthBarPercent: Number(healthRaw),
          triageEngaged: result.triageEngaged,
          outcomeStatus: result.outcome.status,
          auditIntelligenceLogged: result.auditIntelligenceLogged,
        }),
      );

      runs.push({
        success: true,
        tenantId,
        outcome: result.outcome,
        triageEngaged: result.triageEngaged,
        auditIntelligenceLogged: result.auditIntelligenceLogged,
      });
    }

    const payload = flattenCronTenantRuns(runs);
    return NextResponse.json(
      { success: true, ...payload },
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

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
