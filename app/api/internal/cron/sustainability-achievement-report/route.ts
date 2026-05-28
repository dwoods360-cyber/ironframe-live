import { NextResponse } from "next/server";
import { runSustainabilityAchievementReportIfDue } from "@/app/services/ironscribe/sustainabilityAchievementReport";
import {
  checkCronBearerAuth,
  cronBearerUnauthorizedResponse,
} from "@/app/api/internal/cron/cronAuth";

/**
 * Ironscribe — 24h cron: at each 30-day self-healing milestone, generate Sustainability_Achievement_Report_V1.
 * Schedule: `0 20 * * *`. Auth: `Authorization: Bearer ${IRONFRAME_CRON_SECRET}`.
 */
async function handleCron(request: Request) {
  if (!checkCronBearerAuth(request)) {
    return cronBearerUnauthorizedResponse();
  }
  console.info(
    "[CRON_ACTIVATION_TRACE] Sustainability achievement report execution initiated successfully.",
  );

  const result = await runSustainabilityAchievementReportIfDue({ productionMode: true });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json(result);
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
