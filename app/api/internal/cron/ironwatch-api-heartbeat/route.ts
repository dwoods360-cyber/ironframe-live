import { NextResponse } from "next/server";
import { runIronwatchElectricityMapsHeartbeat } from "@/src/services/ironwatch/apiHeartbeat";
import {
  checkCronBearerAuth,
  cronBearerUnauthorizedResponse,
} from "@/app/api/internal/cron/cronAuth";

/**
 * Ironwatch (Agent 15) — Electricity Maps live heartbeat every 15 minutes.
 * Schedule: every 15 minutes (Vercel Cron).
 */
async function handleCron(request: Request) {
  if (!checkCronBearerAuth(request)) {
    return cronBearerUnauthorizedResponse();
  }
  console.info("[CRON_ACTIVATION_TRACE] Ironwatch API heartbeat execution initiated successfully.");

  const result = await runIronwatchElectricityMapsHeartbeat();
  return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
