import { NextResponse } from "next/server";

import { performManualConstitutionalRebaseline } from "@/app/lib/constitutionalRebaseline";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import {
  getTasFingerprintSnapshot,
  performIrontechRestorationFromGoldImage,
} from "@/app/utils/tasFingerprint";

export const dynamic = "force-dynamic";

/**
 * Irontech (Agent 04) — gold image restoration during void, or manual rebaseline when baseline is intact.
 */
export async function POST() {
  try {
    const tenantId = await getActiveTenantUuidFromCookies();
    const restoration = await performIrontechRestorationFromGoldImage();
    if (restoration.ok) {
      const rebaseline = await performManualConstitutionalRebaseline(tenantId);
      return NextResponse.json(
        { ...restoration, rebaseline, integrity: rebaseline.integrity },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (restoration.message.includes("baseline intact")) {
      const rebaseline = await performManualConstitutionalRebaseline(tenantId);
      return NextResponse.json(
        {
          ok: rebaseline.ok,
          message: rebaseline.message,
          sha256: rebaseline.sha256,
          backendReset: rebaseline.backendReset,
          integrity: rebaseline.integrity,
        },
        {
          status: rebaseline.ok ? 200 : 409,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    return NextResponse.json(restoration, { status: 409, headers: { "Cache-Control": "no-store" } });
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
      manualRebaselineWhenIntact: true,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
