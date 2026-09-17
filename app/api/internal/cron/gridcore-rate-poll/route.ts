import { NextResponse } from "next/server";
import { parseCronRequestBody } from "@/app/utils/parseCronRequestBody";
import { executeGridcoreRatePoll } from "@/src/services/ironbloom/gridcoreRatePoll";
import { runGridcoreUtilityRatePoll } from "@/app/services/ironbloom/rateEngine";
import { auditLogCreateLooseTx } from "@/lib/auditLogLoose";
import { tenantKeyFromUuid } from "@/app/utils/tenantIsolation";
import {
  checkCronBearerAuth,
  cronBearerUnauthorizedResponse,
} from "@/app/api/internal/cron/cronAuth";
import {
  flattenCronTenantRuns,
  serializeCronJsonPayload,
} from "@/app/api/internal/cron/cronRouteShell";
import { withIronguardTenant } from "@/app/lib/server/ironguardSessionTenant";
import {
  readExplicitCronTenantId,
  recordCronJobArtifact,
  resolveCronTenantIds,
} from "@/app/lib/server/cronTenantScope";

/**
 * Host-level trigger for Ironbloom regional telemetry (Epic 9.3 carbon ledger) and optional
 * utility rate poll (`?utility=1`, 30-day cadence; `?force=1` bypasses interval).
 * Schedule: `0 6 * * *`. Auth: `Authorization: Bearer ${IRONFRAME_CRON_SECRET}`.
 */
async function handleCron(request: Request) {
  if (!checkCronBearerAuth(request)) {
    return cronBearerUnauthorizedResponse();
  }
  console.info("[CRON_ACTIVATION_TRACE] Gridcore rate poll execution initiated successfully.");

  const explicitTenantId = readExplicitCronTenantId(request);
  let artifactTenantId = explicitTenantId;

  try {
    await parseCronRequestBody(request);
    const url = new URL(request.url);
    const force = url.searchParams.get("force") === "1";
    const runUtility = url.searchParams.get("utility") === "1";
    const zipOverride = url.searchParams.get("zip")?.trim() || undefined;
    const tenantKeyScope = explicitTenantId ? tenantKeyFromUuid(explicitTenantId) : null;
    if (explicitTenantId && !tenantKeyScope) {
      throw new Error(`[GRIDCORE_INVALID_TENANT_SCOPE] Unknown tenantId "${explicitTenantId}".`);
    }

    const tenantIds = await resolveCronTenantIds(explicitTenantId);
    artifactTenantId = tenantIds[0] ?? artifactTenantId;
    const outcome = await executeGridcoreRatePoll();

    const utility = runUtility
      ? await runGridcoreUtilityRatePoll({
          force,
          tenantKey: tenantKeyScope ?? undefined,
          zipOverride,
        })
      : undefined;

    const runs: Array<Record<string, unknown>> = [];
    for (const tenantId of tenantIds) {
      await withIronguardTenant(tenantId, (tx) =>
        auditLogCreateLooseTx(tx, {
          data: {
            action: "SUSTAINABILITY_GRIDCORE_POLL_EXECUTED",
            operatorId: "CRON_ORCHESTRATOR_AGENT_18",
            tenantId,
            governance_tenant_uuid: tenantId,
            justification: `Automated physical metric ledger update successful. Ingested ${outcome.recordsIngested} regional zones. Status: ${outcome.status}.`,
            isSimulation: false,
          },
        }),
      );

      const artifact = await recordCronJobArtifact({
        tenantId,
        agentName: "gridcore-rate-poll",
        payloadJson: serializeCronJsonPayload({
          success: true,
          outcome,
          ...(utility ? { utility } : {}),
          degraded: false,
          source: "cron-gridcore-rate-poll",
        }),
        metricValue: BigInt(outcome.recordsIngested ?? 0),
        metricUnit: "count",
      });

      runs.push({
        success: true,
        degraded: false,
        tenantId,
        outcome,
        ...(utility ? { utility } : {}),
        artifactId: artifact.id,
      });
    }

    return NextResponse.json(
      { success: true, degraded: false, ...flattenCronTenantRuns(runs) },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (artifactTenantId) {
      try {
        await recordCronJobArtifact({
          tenantId: artifactTenantId,
          agentName: "gridcore-rate-poll",
          payloadJson: {
            success: true,
            degraded: true,
            error: "SUSTAINABILITY_LEDGER_CRASH",
            details: message,
            source: "cron-gridcore-rate-poll",
          },
        });
      } catch {
        // Best-effort only.
      }
    }

    return NextResponse.json(
      {
        success: true,
        degraded: true,
        error: "SUSTAINABILITY_LEDGER_CRASH",
        details: message,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
