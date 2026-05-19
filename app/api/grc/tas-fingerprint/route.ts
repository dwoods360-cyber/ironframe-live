import { NextResponse } from "next/server";

import { assessTasMdIntegritySync } from "@/app/lib/tasMdIntegrity";
import { shortenSha256Hex } from "@/app/utils/tasConstitutionalFingerprintFormat";
import { getTasFingerprintSnapshot } from "@/app/utils/tasFingerprint";

export const dynamic = "force-dynamic";

/**
 * Public read-only SHA-256 of `docs/TAS.md` for UI tooltips, victory-lap seal, and drift checks.
 */
export async function GET() {
  const assessment = assessTasMdIntegritySync();
  const snap = getTasFingerprintSnapshot();
  if (!assessment.ok) {
    return NextResponse.json(
      {
        sha256: "",
        sha256Short: "",
        error: "TAS.md unavailable",
        isConstitutionalEmergency: true,
        failureReason: assessment.reason,
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "X-Constitutional-Emergency": "1",
        },
      },
    );
  }
  return NextResponse.json(
    {
      sha256: assessment.sha256,
      sha256Short: shortenSha256Hex(assessment.sha256),
      isConstitutionalEmergency: snap.isConstitutionalEmergency,
      constitutionalRebaselinePending: snap.constitutionalRebaselinePending,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "X-Constitutional-Emergency": snap.isConstitutionalEmergency ? "1" : "0",
        "X-Constitutional-Rebaseline": snap.constitutionalRebaselinePending ? "1" : "0",
      },
    },
  );
}
