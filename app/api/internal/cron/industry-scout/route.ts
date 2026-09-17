import { NextResponse } from "next/server";
import { runIndustryScoutWorker } from "@/app/services/ironsight/crawler";
import { runIronscribeDriveSync } from "@/app/services/ironscribe/driveSync";
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
 * Industry Scout + Ironscribe Drive sync — SEC / NIST CSRC / Colorado + Governance/Regulations folder.
 * Schedule: `0 10 * * *`. Auth: `Authorization: Bearer ${IRONFRAME_CRON_SECRET}`.
 */
async function handleCron(request: Request) {
  if (!checkCronBearerAuth(request)) {
    return cronBearerUnauthorizedResponse();
  }
  console.info("[CRON_ACTIVATION_TRACE] Industry scout execution initiated successfully.");

  const explicitTenantId = readExplicitCronTenantId(request);
  let artifactTenantId = explicitTenantId;

  try {
    const tenantIds = await resolveCronTenantIds(explicitTenantId);
    artifactTenantId = tenantIds[0] ?? artifactTenantId;
    const drive = await runIronscribeDriveSync();
    const runs: Array<Record<string, unknown>> = [];

    for (const tenantId of tenantIds) {
      const scout = await runIndustryScoutWorker({ tenantId });
      const artifact = await recordCronJobArtifact({
        tenantId,
        agentName: "industry-scout",
        payloadJson: {
          scout,
          drive,
          degraded: false,
          source: "cron-industry-scout",
        },
        metricValue: BigInt(scout.newlyIngested),
        metricUnit: "count",
      });
      runs.push({
        ok: true,
        degraded: false,
        tenantId,
        scout,
        drive,
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
          agentName: "industry-scout",
          payloadJson: {
            degraded: true,
            error: "INDUSTRY_SCOUT_CRASH",
            details: message,
            source: "cron-industry-scout",
          },
          metricUnit: "count",
        });
      } catch {
        // Best-effort telemetry write; never block the cron response.
      }
    }

    return NextResponse.json(
      {
        ok: true,
        degraded: true,
        error: "INDUSTRY_SCOUT_CRASH",
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
