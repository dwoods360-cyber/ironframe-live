import { NextRequest, NextResponse } from "next/server";
import { runSustainabilityAchievementReportIfDue } from "@/app/services/ironscribe/sustainabilityAchievementReport";
import { checkCronAuth } from "@/app/api/internal/cron/cronAuth";

/**
 * Ironscribe — 24h cron: at each 30-day self-healing milestone, generate Sustainability_Achievement_Report_V1.
 * Secure with `Authorization: Bearer ${IRONFRAME_CRON_SECRET}` or `x-cron-secret`.
 */
async function handleCron(req: NextRequest) {
  if (!checkCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await runSustainabilityAchievementReportIfDue({ productionMode: true });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json(result);
}

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}
