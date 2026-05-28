import { NextResponse } from "next/server";
import { runIronsightRegulatoryPoll } from "@/app/services/ironsightMonitor";
import { recalculateSystemMaturityScore } from "@/app/services/governanceScoring";
import {
  checkCronBearerAuth,
  cronBearerUnauthorizedResponse,
} from "@/app/api/internal/cron/cronAuth";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import prisma from "@/lib/prisma";

/**
 * Ironsight regulatory horizon poll — pairs with Vercel Cron.
 * Schedule: `0 8 * * *`. Auth: `Authorization: Bearer ${IRONFRAME_CRON_SECRET}`.
 */
async function handleCron(request: Request) {
  if (!checkCronBearerAuth(request)) {
    return cronBearerUnauthorizedResponse();
  }
  console.info("[CRON_ACTIVATION_TRACE] Ironsight regulatory poll execution initiated successfully.");

  const url = new URL(request.url);
  const tenantId =
    request.headers.get("x-tenant-id")?.trim() ||
    url.searchParams.get("tenantId")?.trim() ||
    process.env.SHADOW_PLANE_INGEST_TENANT_UUID?.trim() ||
    TENANT_UUIDS.medshield;

  try {
    const poll = await runIronsightRegulatoryPoll();
    const maturity = await recalculateSystemMaturityScore({ trigger: "IRONSIGHT_REGULATORY_POLL" });
    const prismaAny = prisma as any;
    const artifact = await prismaAny.cronJobArtifact.create({
      data: {
        tenantId,
        agentName: "ironsight-regulatory-poll",
        payloadJson: {
          poll,
          maturityScore: maturity.current.score,
          degraded: false,
          source: "cron-ironsight-regulatory-poll",
        },
      },
      select: { id: true },
    });

    return NextResponse.json({
      ok: true,
      degraded: false,
      poll,
      maturityScore: maturity.current.score,
      artifactId: artifact.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      const prismaAny = prisma as any;
      await prismaAny.cronJobArtifact.create({
        data: {
          tenantId,
          agentName: "ironsight-regulatory-poll",
          payloadJson: {
            degraded: true,
            error: "IRONSIGHT_REGULATORY_POLL_CRASH",
            details: message,
            source: "cron-ironsight-regulatory-poll",
          },
        },
      });
    } catch {
      // Best-effort only.
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
