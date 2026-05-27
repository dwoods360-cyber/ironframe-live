import { NextRequest, NextResponse } from "next/server";
import { parseCronRequestBody } from "@/app/utils/parseCronRequestBody";
import { runCarbonBudgetReallocationAlertIfDue } from "@/app/services/ironbloom/carbonBudgetReallocationAlert";
import { checkCronAuth } from "@/app/api/internal/cron/cronAuth";

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

  await parseCronRequestBody(req);
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";

  const result = await runCarbonBudgetReallocationAlertIfDue({ force });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json(result);
}

/** Vercel Cron invokes GET; manual ops may POST with the same secret. */
export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}
