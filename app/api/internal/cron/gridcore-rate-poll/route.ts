import { NextResponse } from "next/server";
import { parseCronRequestBody } from "@/app/utils/parseCronRequestBody";
import { executeGridcoreRatePoll } from "@/src/services/ironbloom/gridcoreRatePoll";
import { runGridcoreUtilityRatePoll } from "@/app/services/ironbloom/rateEngine";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import { TENANT_UUIDS, tenantKeyFromUuid } from "@/app/utils/tenantIsolation";
import {
  checkCronBearerAuth,
  cronBearerUnauthorizedResponse,
} from "@/app/api/internal/cron/cronAuth";
import { serializeCronJsonPayload } from "@/app/api/internal/cron/cronRouteShell";
import prisma from "@/lib/prisma";

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

  try {
    await parseCronRequestBody(request);
    const url = new URL(request.url);
    const force = url.searchParams.get("force") === "1";
    const runUtility = url.searchParams.get("utility") === "1";
    const explicitTenantId =
      request.headers.get("x-tenant-id")?.trim() || url.searchParams.get("tenantId")?.trim();
    const tenantId = explicitTenantId || TENANT_UUIDS.gridcore;
    const zipOverride = url.searchParams.get("zip")?.trim() || undefined;
    const tenantKeyScope = explicitTenantId ? tenantKeyFromUuid(explicitTenantId) : null;
    if (explicitTenantId && !tenantKeyScope) {
      throw new Error(`[GRIDCORE_INVALID_TENANT_SCOPE] Unknown tenantId "${explicitTenantId}".`);
    }

    const outcome = await executeGridcoreRatePoll();

    await auditLogCreateLoose({
      data: {
        action: "SUSTAINABILITY_GRIDCORE_POLL_EXECUTED",
        operatorId: "CRON_ORCHESTRATOR_AGENT_18",
        tenantId: TENANT_UUIDS.gridcore,
        governance_tenant_uuid: TENANT_UUIDS.gridcore,
        justification: `Automated physical metric ledger update successful. Ingested ${outcome.recordsIngested} regional zones. Status: ${outcome.status}.`,
        isSimulation: false,
      },
    });

    const utility = runUtility
      ? await runGridcoreUtilityRatePoll({
          force,
          tenantKey: tenantKeyScope ?? undefined,
          zipOverride,
        })
      : undefined;
    const prismaAny = prisma as any;
    const artifact = await prismaAny.cronJobArtifact.create({
      data: {
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
      },
      select: { id: true },
    });

    return NextResponse.json(
      {
        success: true,
        degraded: false,
        outcome,
        ...(utility ? { utility } : {}),
        artifactId: artifact.id,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      const url = new URL(request.url);
      const tenantId =
        request.headers.get("x-tenant-id")?.trim() ||
        url.searchParams.get("tenantId")?.trim() ||
        TENANT_UUIDS.gridcore;
      const prismaAny = prisma as any;
      await prismaAny.cronJobArtifact.create({
        data: {
          tenantId,
          agentName: "gridcore-rate-poll",
          payloadJson: {
            success: true,
            degraded: true,
            error: "SUSTAINABILITY_LEDGER_CRASH",
            details: message,
            source: "cron-gridcore-rate-poll",
          },
        },
      });
    } catch {
      // Best-effort only.
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
