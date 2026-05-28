import { NextRequest, NextResponse } from "next/server";
import { parseCronRequestBody } from "@/app/utils/parseCronRequestBody";
import { runCarbonBudgetReallocationAlertIfDue } from "@/app/services/ironbloom/carbonBudgetReallocationAlert";
import { checkCronAuth } from "@/app/api/internal/cron/cronAuth";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import prisma from "@/lib/prisma";

function toJsonPayload(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, raw) => (typeof raw === "bigint" ? raw.toString() : raw)),
  );
}

/**
 * Ironbloom — monthly cron (UTC day 1, ~09:00 via host scheduler):
 * Budget Reallocation alert when `mitigatedValueCents` exceeds `IRONBLOOM_MONTHLY_CARBON_BUDGET_THRESHOLD_CENTS`.
 *
 * Schedule: `0 9 1 * *` (monthly, day 1, 09:00 UTC).
 * Secure with `Authorization: Bearer ${IRONFRAME_CRON_SECRET}` or `x-cron-secret`.
 */
async function handleCron(req: NextRequest) {
  if (!checkCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  console.info("[CRON_ACTIVATION_TRACE] Carbon budget reallocation execution initiated successfully.");

  const url = new URL(req.url);
  const tenantId =
    req.headers.get("x-tenant-id")?.trim() ||
    url.searchParams.get("tenantId")?.trim() ||
    process.env.SHADOW_PLANE_INGEST_TENANT_UUID?.trim() ||
    TENANT_UUIDS.medshield;

  try {
    await parseCronRequestBody(req);
    const force = url.searchParams.get("force") === "1";

    const result = await runCarbonBudgetReallocationAlertIfDue({ force });
    const safeResult = toJsonPayload(result) as Record<string, unknown>;
    const prismaAny = prisma as any;
    const metricValue =
      typeof (result as any)?.mitigatedValueCents === "bigint"
        ? (result as any).mitigatedValueCents
        : typeof (result as any)?.mitigatedValueCents === "number"
          ? BigInt((result as any).mitigatedValueCents)
          : null;

    const artifact = await prismaAny.cronJobArtifact.create({
      data: {
        tenantId,
        agentName: "carbon-budget-reallocation",
        payloadJson: toJsonPayload({
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

/** Vercel Cron invokes GET; manual ops may POST with the same secret. */
export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}
