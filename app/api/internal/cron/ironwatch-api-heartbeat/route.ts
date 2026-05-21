import { NextResponse } from "next/server";
import { runIronwatchElectricityMapsHeartbeat } from "@/src/services/ironwatch/apiHeartbeat";

/**
 * Ironwatch (Agent 15) — Electricity Maps live heartbeat every 15 minutes.
 * Secure with `Authorization: Bearer ${IRONFRAME_CRON_SECRET}` or `x-cron-secret`.
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

  const result = await runIronwatchElectricityMapsHeartbeat();
  return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
}
