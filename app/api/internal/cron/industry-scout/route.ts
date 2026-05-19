import { NextResponse } from "next/server";
import { runIndustryScoutWorker } from "@/app/services/ironsight/crawler";
import { runIronscribeDriveSync } from "@/app/services/ironscribe/driveSync";

/**
 * Industry Scout + Ironscribe Drive sync — SEC / NIST CSRC / Colorado + Governance/Regulations folder.
 * Secure with IRONFRAME_CRON_SECRET.
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

  const scout = await runIndustryScoutWorker();
  const drive = await runIronscribeDriveSync();

  return NextResponse.json({
    ok: true,
    scout,
    drive,
  });
}
