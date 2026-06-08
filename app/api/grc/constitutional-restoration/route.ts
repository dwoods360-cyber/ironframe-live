import { NextResponse } from "next/server";

import {
  getTasFingerprintSnapshot,
  performIrontechRestorationFromGoldImage,
  syncConstitutionalIntegrityEnforcement,
} from "@/app/utils/tasFingerprint";

export const dynamic = "force-dynamic";

/**
 * Irontech (Agent 04) — sole automated job permitted during constitutional void.
 */
export async function POST() {
  try {
    const restoration = await performIrontechRestorationFromGoldImage();
    if (!restoration.ok) {
      return NextResponse.json(restoration, { status: 409, headers: { "Cache-Control": "no-store" } });
    }
    const snap = await syncConstitutionalIntegrityEnforcement();
    return NextResponse.json(
      { ...restoration, integrity: snap },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Restoration failed.";
    return NextResponse.json({ ok: false, message: msg }, { status: 403 });
  }
}

export async function GET() {
  const snap = getTasFingerprintSnapshot();
  return NextResponse.json(
    {
      allowed: snap.isConstitutionalEmergency,
      job: "restorationFromGoldImage",
      agent: "Irontech",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
