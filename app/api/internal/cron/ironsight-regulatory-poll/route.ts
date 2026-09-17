import { NextResponse } from "next/server";
import { runIronsightRegulatoryPoll } from "@/app/services/ironsightMonitor";
import { recalculateSystemMaturityScore } from "@/app/services/governanceScoring";
import {
  checkCronBearerAuth,
  cronBearerUnauthorizedResponse,
} from "@/app/api/internal/cron/cronAuth";
import { flattenCronTenantRuns } from "@/app/api/internal/cron/cronRouteShell";
import {
  readExplicitCronTenantId,
  recordCronJobArtifact,
  resolveCronTenantIds,
} from "@/app/lib/server/cronTenantScope";

/**
 * Ironsight regulatory horizon poll — pairs with Vercel Cron.
 * Schedule: `0 8 * * *`. Auth: `Authorization: Bearer ${IRONFRAME_CRON_SECRET}`.
 */
async function handleCron(request: Request) {
  if (!checkCronBearerAuth(request)) {
    return cronBearerUnauthorizedResponse();
  }
  console.info("[CRON_ACTIVATION_TRACE] Ironsight regulatory poll execution initiated successfully.");

  const explicitTenantId = readExplicitCronTenantId(request);
  let artifactTenantId = explicitTenantId;

  try {
    const tenantIds = await resolveCronTenantIds(explicitTenantId);
    artifactTenantId = tenantIds[0] ?? artifactTenantId;
    const runs: Array<Record<string, unknown>> = [];

    for (const tenantId of tenantIds) {
      const poll = await runIronsightRegulatoryPoll(tenantId);
      const maturity = await recalculateSystemMaturityScore({
        tenantId,
        trigger: "IRONSIGHT_REGULATORY_POLL",
      });
      const artifact = await recordCronJobArtifact({
        tenantId,
        agentName: "ironsight-regulatory-poll",
        payloadJson: {
          poll,
          maturityScore: maturity.current.score,
          degraded: false,
          source: "cron-ironsight-regulatory-poll",
        },
      });
      runs.push({
        ok: true,
        degraded: false,
        tenantId,
        poll,
        maturityScore: maturity.current.score,
        artifactId: artifact.id,
      });
    }

    return NextResponse.json({ ok: true, degraded: false, ...flattenCronTenantRuns(runs) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (artifactTenantId) {
      try {
        await recordCronJobArtifact({
          tenantId: artifactTenantId,
          agentName: "ironsight-regulatory-poll",
          payloadJson: {
            degraded: true,
            error: "IRONSIGHT_REGULATORY_POLL_CRASH",
            details: message,
            source: "cron-ironsight-regulatory-poll",
          },
        });
      } catch {
        // Best-effort only.
      }
    }

    return NextResponse.json(
      {
        ok: true,
        degraded: true,
        error: "IRONSIGHT_REGULATORY_POLL_CRASH",
        details: message,
      },
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
