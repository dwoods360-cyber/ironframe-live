import { NextRequest, NextResponse } from "next/server";
import { runIndustryScoutWorker } from "@/app/services/ironsight/crawler";
import { runIronscribeDriveSync } from "@/app/services/ironscribe/driveSync";
import { checkCronAuth } from "@/app/api/internal/cron/_cronAuth";

/**
 * Industry Scout + Ironscribe Drive sync — SEC / NIST CSRC / Colorado + Governance/Regulations folder.
 * Secure with IRONFRAME_CRON_SECRET.
 */
async function handleCron(req: NextRequest) {
  if (!checkCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const scout = await runIndustryScoutWorker();
  const drive = await runIronscribeDriveSync();

  return NextResponse.json({
    ok: true,
    scout,
    drive,
  });
}

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}
