import { NextResponse } from "next/server";
import { processAgent17OutboxBatch } from "@/app/actions/agent17SentinelActions";

/**
 * Drain Agent 17 Sentinel automation outbox (pairs with `pg_cron` inserts on `sentinel_automation_outbox`).
 * Secure with `Authorization: Bearer ${IRONFRAME_CRON_SECRET}` or `x-cron-secret` header.
 */
export async function POST(req: Request) {
  const secret = process.env.IRONFRAME_CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ ok: false, error: "IRONFRAME_CRON_SECRET is not configured." }, { status: 503 });
  }

  const auth = req.headers.get("authorization")?.trim();
  const headerSecret = req.headers.get("x-cron-secret")?.trim();
  const bearer = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : null;
  if (bearer !== secret && headerSecret !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;

  const result = await processAgent17OutboxBatch(Number.isFinite(limit) ? limit : undefined);
  return NextResponse.json({ ok: true, ...result });
}
