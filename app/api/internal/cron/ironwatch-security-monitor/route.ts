import { NextResponse } from "next/server";
import { runIronwatchSecurityMonitor } from "@/src/services/ironwatch/securityMonitor";
import {
  checkCronBearerAuth,
  cronBearerUnauthorizedResponse,
} from "@/app/api/internal/cron/cronAuth";

/**
 * Ironwatch — Ironguard violation circuit breaker (cron / manual).
 * Schedule: `0 12 * * *`. Auth: `Authorization: Bearer ${IRONFRAME_CRON_SECRET}`.
 */
async function handleCron(request: Request) {
  if (!checkCronBearerAuth(request)) {
    return cronBearerUnauthorizedResponse();
  }
  console.info("[CRON_ACTIVATION_TRACE] Ironwatch security monitor execution initiated successfully.");

  const result = await runIronwatchSecurityMonitor();
  return NextResponse.json(result);
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
