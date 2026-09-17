import { NextResponse } from "next/server";
import { parseCronRequestBody } from "@/app/utils/parseCronRequestBody";
import { runCarbonBudgetReallocationAlertIfDue } from "@/app/services/ironbloom/carbonBudgetReallocationAlert";
import {
  checkCronBearerAuth,
  cronBearerUnauthorizedResponse,
} from "@/app/api/internal/cron/cronAuth";
import {
  coerceBigIntCents,
  flattenCronTenantRuns,
  serializeCronJsonPayload,
} from "@/app/api/internal/cron/cronRouteShell";
import {
  readExplicitCronTenantId,
  recordCronJobArtifact,
  resolveCronTenantIds,
} from "@/app/lib/server/cronTenantScope";

/**
 * Ironbloom — monthly cron (UTC day 1, 09:00):
 * Budget Reallocation alert when `mitigatedValueCents` exceeds threshold.
 * Schedule: `0 9 1 * *`. Auth: `Authorization: Bearer ${IRONFRAME_CRON_SECRET}`.
 */
async function handleCron(request: Request) {
  if (!checkCronBearerAuth(request)) {
    return cronBearerUnauthorizedResponse();
  }
  console.info("[CRON_ACTIVATION_TRACE] Carbon budget reallocation execution initiated successfully.");

  const explicitTenantId = readExplicitCronTenantId(request);
  let artifactTenantId = explicitTenantId;

  try {
    await parseCronRequestBody(request);
    const url = new URL(request.url);
    const force = url.searchParams.get("force") === "1";
    const tenantIds = await resolveCronTenantIds(explicitTenantId);
    artifactTenantId = tenantIds[0] ?? artifactTenantId;
    const runs: Array<Record<string, unknown>> = [];

    for (const tenantId of tenantIds) {
      const result = await runCarbonBudgetReallocationAlertIfDue({ force, tenantId });
      const safeResult = serializeCronJsonPayload(result) as Record<string, unknown>;
      const metricValue =
        coerceBigIntCents((result as { mitigatedValueCents?: unknown }).mitigatedValueCents) ??
        coerceBigIntCents(safeResult.mitigatedValueCents);

      const artifact = await recordCronJobArtifact({
        tenantId,
        agentName: "carbon-budget-reallocation",
        payloadJson: serializeCronJsonPayload({
          result: safeResult,
          degraded: !result.ok,
          source: "cron-carbon-budget-reallocation",
        }),
        metricValue,
        metricUnit: metricValue == null ? null : "cents",
      });

      runs.push({
        ...safeResult,
        tenantId,
        degraded: !result.ok,
        artifactId: artifact.id,
        ...(result.ok ? {} : { error: result.error }),
      });
    }

    const anyDegraded = runs.some((run) => run.degraded === true);
    return NextResponse.json(
      { ok: true, degraded: anyDegraded, ...flattenCronTenantRuns(runs) },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (artifactTenantId) {
      try {
        await recordCronJobArtifact({
          tenantId: artifactTenantId,
          agentName: "carbon-budget-reallocation",
          payloadJson: {
            degraded: true,
            error: "CARBON_BUDGET_REALLOCATION_CRASH",
            details: message,
            source: "cron-carbon-budget-reallocation",
          },
        });
      } catch {
        // Best-effort only.
      }
    }

    return NextResponse.json(
      { ok: true, degraded: true, error: "CARBON_BUDGET_REALLOCATION_CRASH", details: message },
      { status: 200 },
    );
  }
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
