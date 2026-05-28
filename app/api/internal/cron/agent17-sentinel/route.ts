import { NextResponse } from "next/server";
import { processAgent17OutboxBatch } from "@/app/actions/agent17SentinelActions";
import {
  checkCronBearerAuth,
  cronBearerUnauthorizedResponse,
} from "@/app/api/internal/cron/cronAuth";

/**
 * Drain Agent 17 Sentinel automation outbox (pairs with `pg_cron` inserts on `sentinel_automation_outbox`).
 * Schedule: every 5 minutes (Vercel Cron). Auth: Bearer IRONFRAME_CRON_SECRET.
 */
async function handleCron(request: Request) {
  if (!checkCronBearerAuth(request)) {
    return cronBearerUnauthorizedResponse();
  }
  console.info("[CRON_ACTIVATION_TRACE] Agent 17 sentinel execution initiated successfully.");

  const url = new URL(request.url);
  const limitRaw = url.searchParams.get("limit");
  const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
  const limit = parsedLimit !== undefined && Number.isFinite(parsedLimit) ? parsedLimit : undefined;

  const result = await processAgent17OutboxBatch(limit);
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
