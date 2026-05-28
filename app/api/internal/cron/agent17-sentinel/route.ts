import { NextRequest, NextResponse } from "next/server";
import { processAgent17OutboxBatch } from "@/app/actions/agent17SentinelActions";
import { checkCronAuth } from "@/app/api/internal/cron/cronAuth";

/**
 * Drain Agent 17 Sentinel automation outbox (pairs with `pg_cron` inserts on `sentinel_automation_outbox`).
 * Secure with `Authorization: Bearer ${IRONFRAME_CRON_SECRET}` or `x-cron-secret` header.
 */
async function handleCron(req: NextRequest) {
  if (!checkCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  console.info("[CRON_ACTIVATION_TRACE] Agent 17 sentinel execution initiated successfully.");

  const url = new URL(req.url);
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;

  const result = await processAgent17OutboxBatch(Number.isFinite(limit) ? limit : undefined);
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}
