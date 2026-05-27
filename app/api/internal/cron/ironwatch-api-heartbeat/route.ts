import { NextRequest, NextResponse } from "next/server";
import { runIronwatchElectricityMapsHeartbeat } from "@/src/services/ironwatch/apiHeartbeat";
import { checkCronAuth } from "@/app/api/internal/cron/cronAuth";

/**
 * Ironwatch (Agent 15) — Electricity Maps live heartbeat every 15 minutes.
 * Secure with `Authorization: Bearer ${IRONFRAME_CRON_SECRET}` or `x-cron-secret`.
 */
async function handleCron(req: NextRequest) {
  if (!checkCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await runIronwatchElectricityMapsHeartbeat();
  return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}
