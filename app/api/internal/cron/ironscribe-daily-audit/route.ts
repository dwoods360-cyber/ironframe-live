import { NextResponse } from "next/server";
import { runIronscribeDailyAuditSynthesis } from "@/src/services/ironscribe/auditSynthesizer";
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
 * Ironscribe — daily 24h audit synthesis to `storage/forensics/audits/DAILY_AUDIT_REPORT_<timestamp>.md`.
 * Schedule: `0 18 * * *`. Auth: `Authorization: Bearer ${IRONFRAME_CRON_SECRET}`.
 */
async function handleCron(request: Request) {
  if (!checkCronBearerAuth(request)) {
    return cronBearerUnauthorizedResponse();
  }
  console.info("[CRON_ACTIVATION_TRACE] Ironscribe daily audit execution initiated successfully.");

  const explicitTenantId = readExplicitCronTenantId(request);
  let artifactTenantId = explicitTenantId;

  try {
    const tenantIds = await resolveCronTenantIds(explicitTenantId);
    artifactTenantId = tenantIds[0] ?? artifactTenantId;
    const result = await runIronscribeDailyAuditSynthesis();
    const runs: Array<Record<string, unknown>> = [];

    for (const tenantId of tenantIds) {
      const artifact = await recordCronJobArtifact({
        tenantId,
        agentName: "ironscribe-daily-audit",
        payloadJson: {
          result,
          degraded: false,
          source: "cron-ironscribe-daily-audit",
        },
      });
      runs.push({
        ...result,
        ok: true,
        degraded: false,
        tenantId,
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
          agentName: "ironscribe-daily-audit",
          payloadJson: {
            degraded: true,
            error: "IRONSCRIBE_DAILY_AUDIT_CRASH",
            details: message,
            source: "cron-ironscribe-daily-audit",
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
        error: "IRONSCRIBE_DAILY_AUDIT_CRASH",
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
