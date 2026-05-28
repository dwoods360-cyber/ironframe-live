import { NextResponse } from "next/server";
import { parseCronRequestBody } from "@/app/utils/parseCronRequestBody";
import { runCarbonBudgetReallocationAlertIfDue } from "@/app/services/ironbloom/carbonBudgetReallocationAlert";
import {
  checkCronBearerAuth,
  cronBearerUnauthorizedResponse,
} from "@/app/api/internal/cron/cronAuth";
import {
  coerceBigIntCents,
  serializeCronJsonPayload,
} from "@/app/api/internal/cron/cronRouteShell";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import prisma from "@/lib/prisma";

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

  const url = new URL(request.url);
  const tenantId =
    request.headers.get("x-tenant-id")?.trim() ||
    url.searchParams.get("tenantId")?.trim() ||
    process.env.SHADOW_PLANE_INGEST_TENANT_UUID?.trim() ||
    TENANT_UUIDS.medshield;

  try {
    await parseCronRequestBody(request);
    const force = url.searchParams.get("force") === "1";

    const result = await runCarbonBudgetReallocationAlertIfDue({ force });
    const safeResult = serializeCronJsonPayload(result) as Record<string, unknown>;
    const metricValue =
      coerceBigIntCents((result as { mitigatedValueCents?: unknown }).mitigatedValueCents) ??
      coerceBigIntCents(safeResult.mitigatedValueCents);

    const prismaAny = prisma as any;
    const artifact = await prismaAny.cronJobArtifact.create({
      data: {
        tenantId,
        agentName: "carbon-budget-reallocation",
        payloadJson: serializeCronJsonPayload({
          result: safeResult,
          degraded: !result.ok,
          source: "cron-carbon-budget-reallocation",
        }),
        metricValue,
        metricUnit: metricValue == null ? null : "cents",
      },
      select: { id: true },
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: true, degraded: true, error: result.error, artifactId: artifact.id },
        { status: 200 },
      );
    }

    return NextResponse.json({ ...safeResult, degraded: false, artifactId: artifact.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      const prismaAny = prisma as any;
      await prismaAny.cronJobArtifact.create({
        data: {
          tenantId,
          agentName: "carbon-budget-reallocation",
          payloadJson: {
            degraded: true,
            error: "CARBON_BUDGET_REALLOCATION_CRASH",
            details: message,
            source: "cron-carbon-budget-reallocation",
          },
        },
      });
    } catch {
      // Best-effort only.
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
