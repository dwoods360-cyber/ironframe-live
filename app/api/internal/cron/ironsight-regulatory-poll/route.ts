import { NextRequest, NextResponse } from "next/server";
import { runIronsightRegulatoryPoll } from "@/app/services/ironsightMonitor";
import { recalculateSystemMaturityScore } from "@/app/services/governanceScoring";
import { checkCronAuth } from "@/app/api/internal/cron/_cronAuth";

/**
 * Ironsight regulatory horizon poll — pairs with Vercel Cron / external scheduler.
 * Secure with `Authorization: Bearer ${IRONFRAME_CRON_SECRET}` or `x-cron-secret`.
 */
async function handleCron(req: NextRequest) {
  if (!checkCronAuth(req)) {
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

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}
