import { NextResponse } from "next/server";
import { runIndustryScoutWorker } from "@/app/services/ironsight/crawler";
import { runIronscribeDriveSync } from "@/app/services/ironscribe/driveSync";
import {
  checkCronBearerAuth,
  cronBearerUnauthorizedResponse,
} from "@/app/api/internal/cron/cronAuth";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import prisma from "@/lib/prisma";

/**
 * Industry Scout + Ironscribe Drive sync — SEC / NIST CSRC / Colorado + Governance/Regulations folder.
 * Schedule: `0 10 * * *`. Auth: `Authorization: Bearer ${IRONFRAME_CRON_SECRET}`.
 */
async function handleCron(request: Request) {
  if (!checkCronBearerAuth(request)) {
    return cronBearerUnauthorizedResponse();
  }
  console.info("[CRON_ACTIVATION_TRACE] Industry scout execution initiated successfully.");

  const url = new URL(request.url);
  const tenantId =
    request.headers.get("x-tenant-id")?.trim() ||
    url.searchParams.get("tenantId")?.trim() ||
    process.env.SHADOW_PLANE_INGEST_TENANT_UUID?.trim() ||
    TENANT_UUIDS.medshield;

  try {
    const scout = await runIndustryScoutWorker({ tenantId });
    const drive = await runIronscribeDriveSync();
    const prismaAny = prisma as any;
    const artifact = await prismaAny.cronJobArtifact.create({
      data: {
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
      },
      select: {
        id: true,
      },
    });

    return NextResponse.json({
      ok: true,
      degraded: false,
      scout,
      drive,
      artifactId: artifact.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      const prismaAny = prisma as any;
      await prismaAny.cronJobArtifact.create({
        data: {
          tenantId,
          agentName: "industry-scout",
          payloadJson: {
            degraded: true,
            error: "INDUSTRY_SCOUT_CRASH",
            details: message,
            source: "cron-industry-scout",
          },
          metricUnit: "count",
        },
      });
    } catch {
      // Best-effort telemetry write; never block the cron response.
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
