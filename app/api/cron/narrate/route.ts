import { NextResponse } from "next/server";

import {
  checkCronBearerAuth,
  cronBearerUnauthorizedResponse,
} from "@/app/api/internal/cron/cronAuth";
import { evaluateAlertThresholds } from "@/app/lib/governanceFrame/briefingDraftValidation";
import { getSharedBoardContextForTenant } from "@/app/lib/board/sharedBoardContext";
import { runNightlyGovernanceNarrate } from "@/app/lib/reports/narrateGovernanceTriad";
import { resolveCronTenantIds } from "@/app/lib/server/cronTenantScope";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function parseExposureCentsFromPayload(payload: Awaited<ReturnType<typeof getSharedBoardContextForTenant>>): bigint {
  return payload.financials.currentExposureCents;
}

/**
 * Nightly 03:30 UTC boardroom narrative hydration (staggered after 03:00 doc/heartbeat crons).
 * Local Windows: Task `\Ironframe GRC Narrative Hydration` at 03:30 via `scripts/cron_narrate_api_scheduled.ps1`.
 * Auth: Authorization: Bearer ${IRONFRAME_CRON_SECRET}
 */
async function handleNarrate(request: Request) {
  if (!checkCronBearerAuth(request)) {
    return cronBearerUnauthorizedResponse();
  }

  const startedAt = new Date().toISOString();
  console.info(
    "[CRON_ACTIVATION_TRACE] Governance Frame narrate execution initiated.",
    JSON.stringify({ startedAt, schedule: "30 3 * * *" }),
  );

  const url = new URL(request.url);
  const explicitTenantId =
    request.headers.get("x-tenant-id")?.trim() || url.searchParams.get("tenantId")?.trim() || null;

  let preflightSnapshot: Record<string, string> = {
    startedAt,
  };

  try {
    const tenantIds = await resolveCronTenantIds(explicitTenantId);
    const runs: Array<Record<string, unknown>> = [];

    for (const tenantId of tenantIds) {
      const boardContext = await getSharedBoardContextForTenant(tenantId);
      const currentExposureCents = parseExposureCentsFromPayload(boardContext);
      const thresholdEval = evaluateAlertThresholds(currentExposureCents);

      preflightSnapshot = {
        tenantId,
        startedAt,
        tenantSlug: boardContext.financials.display.activeTenant.slug || "tenant",
        companyName: boardContext.financials.display.activeTenant.companyName,
        currentExposureCents: thresholdEval.currentExposureCents.toString(),
        thresholdCents: thresholdEval.thresholdCents.toString(),
        requiresImmediatePromotion: String(thresholdEval.requiresImmediatePromotion),
        systemStatus: boardContext.systemStatus,
      };

      console.info(
        "[CRON_HEALTH_TELEMETRY] narrate preflight validation snapshot",
        JSON.stringify(preflightSnapshot),
      );

      const result = await runNightlyGovernanceNarrate(tenantId);
      runs.push({ ...result, tenantId, healthTelemetry: preflightSnapshot });
    }

    const completedAt = new Date().toISOString();
    const primary = runs[0] ?? {};
    console.info(
      "[CRON_HEALTH_TELEMETRY] narrate execution completed",
      JSON.stringify({
        startedAt,
        completedAt,
        tenantCount: runs.length,
        snapshotId: primary.snapshotId ?? null,
        artifactId: primary.artifactId ?? null,
      }),
    );

    if (runs.length === 1) {
      return NextResponse.json({
        ok: true,
        ...primary,
        healthTelemetry: {
          ...(primary.healthTelemetry as Record<string, string>),
          completedAt,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      tenantCount: runs.length,
      tenants: runs,
      healthTelemetry: { startedAt, completedAt, tenantCount: String(runs.length) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Narrate cron failed.";
    console.error(
      "[CRON_HEALTH_TELEMETRY] narrate execution failed",
      JSON.stringify({ ...preflightSnapshot, error: message }),
    );
    return NextResponse.json({ ok: false, error: message, healthTelemetry: preflightSnapshot }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleNarrate(request);
}

export async function POST(request: Request) {
  return handleNarrate(request);
}
