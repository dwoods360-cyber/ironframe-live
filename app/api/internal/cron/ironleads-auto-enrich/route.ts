import { NextResponse } from "next/server";

import {
  checkCronBearerAuth,
  cronBearerUnauthorizedResponse,
} from "@/app/api/internal/cron/cronAuth";
import { serializeCronJsonPayload } from "@/app/api/internal/cron/cronRouteShell";
import { runIronleadsAutoEnrichBatch } from "@/app/lib/server/ironleadsAutoEnrichCore";
import prisma from "@/lib/prisma";

/**
 * Ironleads auto-enrich — fills `@ironleads.local` placeholders via Prospeo → Apollo
 * (Hunter opt-in). Never promotes / never DISPATCHes.
 *
 * Schedule: every 2 hours weekdays (cron: 0 every-2h Mon-Fri).
 * Kill switch: `IRONLEADS_AUTO_ENRICH_ENABLED=1`.
 * Auth: `Authorization: Bearer ${IRONFRAME_CRON_SECRET}`.
 */
async function handleCron(request: Request) {
  if (!checkCronBearerAuth(request)) {
    return cronBearerUnauthorizedResponse();
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const limitRaw = Number(url.searchParams.get("limit") || "");
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : undefined;

  console.info("[CRON_ACTIVATION_TRACE] Ironleads auto-enrich initiated.", {
    dryRun,
    limit,
  });

  const tenantId =
    process.env.IRONFRAME_PROSPECT_POOL_TENANT_UUID?.trim() ||
    "11111111-1111-4111-8111-111111111111";

  try {
    const batch = await runIronleadsAutoEnrichBatch({ dryRun, limit });
    const applied = batch.results.reduce(
      (n, row) => n + row.providers.filter((p) => p.ok && p.appliedEmail).length,
      0,
    );

    const prismaAny = prisma as any;
    const artifact = await prismaAny.cronJobArtifact.create({
      data: {
        tenantId,
        agentName: "ironleads-auto-enrich",
        payloadJson: serializeCronJsonPayload({
          batch,
          source: "cron-ironleads-auto-enrich",
          degraded: false,
        }),
        metricValue: BigInt(applied),
        metricUnit: "count",
      },
      select: { id: true },
    });

    return NextResponse.json({
      ok: true,
      degraded: false,
      artifactId: artifact.id,
      enabled: batch.enabled,
      skippedReason: batch.skippedReason,
      dryRun: batch.dryRun,
      selected: batch.selected,
      appliedEmailCount: applied,
      providersEnabled: batch.providersEnabled,
      results: batch.results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      const prismaAny = prisma as any;
      await prismaAny.cronJobArtifact.create({
        data: {
          tenantId,
          agentName: "ironleads-auto-enrich",
          payloadJson: {
            degraded: true,
            error: "IRONLEADS_AUTO_ENRICH_CRASH",
            details: message,
            source: "cron-ironleads-auto-enrich",
          },
          metricUnit: "count",
        },
      });
    } catch {
      // Best-effort telemetry.
    }

    return NextResponse.json(
      {
        ok: true,
        degraded: true,
        error: "IRONLEADS_AUTO_ENRICH_CRASH",
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
