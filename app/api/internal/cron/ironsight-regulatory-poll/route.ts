import { NextResponse } from "next/server";
import { runIronsightRegulatoryPoll } from "@/app/services/ironsightMonitor";
import { recalculateSystemMaturityScore } from "@/app/services/governanceScoring";

/**
 * Ironsight regulatory horizon poll — pairs with Vercel Cron / external scheduler.
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

  const poll = await runIronsightRegulatoryPoll();
  const maturity = await recalculateSystemMaturityScore({ trigger: "IRONSIGHT_REGULATORY_POLL" });

  return NextResponse.json({
    ok: true,
    poll,
    maturityScore: maturity.current.score,
  });
}
