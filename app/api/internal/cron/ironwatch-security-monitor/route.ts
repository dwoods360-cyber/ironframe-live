import { NextRequest, NextResponse } from "next/server";
import { runIronwatchSecurityMonitor } from "@/src/services/ironwatch/securityMonitor";
import { checkCronAuth } from "@/app/api/internal/cron/cronAuth";

/**
 * Ironwatch — Ironguard violation circuit breaker (cron / manual).
 * Auth: \`Authorization: Bearer ${IRONFRAME_CRON_SECRET}\` or \`x-cron-secret\`.
 */
async function handleCron(req: NextRequest) {
  if (!checkCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await runIronwatchSecurityMonitor();
  return NextResponse.json(result);
}

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}
