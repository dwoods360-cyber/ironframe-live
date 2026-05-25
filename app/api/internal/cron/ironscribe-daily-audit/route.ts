import { NextRequest, NextResponse } from "next/server";
import { runIronscribeDailyAuditSynthesis } from "@/src/services/ironscribe/auditSynthesizer";
import { checkCronAuth } from "@/app/api/internal/cron/_cronAuth";

/**
 * Ironscribe — daily 24h audit synthesis to \`storage/forensics/audits/DAILY_AUDIT_REPORT_<timestamp>.md\`.
 * Auth: \`Authorization: Bearer ${IRONFRAME_CRON_SECRET}\` or \`x-cron-secret\`.
 */
async function handleCron(req: NextRequest) {
  if (!checkCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await runIronscribeDailyAuditSynthesis();
  return NextResponse.json(result);
}

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}
