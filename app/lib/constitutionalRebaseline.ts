import "server-only";

import { assessTasMdIntegritySync } from "@/app/lib/tasMdIntegrity";
import { recordDeadManSwitchResolution } from "@/app/lib/deadMansSwitch";
import {
  resetConstitutionalBackendLockState,
  type ConstitutionalBackendLockReset,
} from "@/app/lib/systemConfigSafeAccess";
import {
  performIrontechRebaselineVerification,
  syncConstitutionalIntegrityEnforcement,
  type TasFingerprintSnapshot,
} from "@/app/utils/tasFingerprint";

export type ManualConstitutionalRebaselineResult = {
  ok: boolean;
  message: string;
  sha256: string | null;
  backendReset: ConstitutionalBackendLockReset;
  integrity: TasFingerprintSnapshot;
};

/**
 * Irontech manual rebaseline when `docs/TAS.md` is valid but UI/backend latches remain armed.
 */
export async function performManualConstitutionalRebaseline(
  tenantId?: string | null,
): Promise<ManualConstitutionalRebaselineResult> {
  const assessment = assessTasMdIntegritySync();
  if (!assessment.ok) {
    const snap = await syncConstitutionalIntegrityEnforcement(tenantId);
    return {
      ok: false,
      message: `TAS.md integrity failure (${assessment.reason}): ${assessment.message}`,
      sha256: null,
      backendReset: {
        stateFreezeCleared: false,
        emergencySealSanitized: false,
        escalationTimestampsCleared: false,
        errors: [],
      },
      integrity: snap,
    };
  }

  const backendReset = await resetConstitutionalBackendLockState();
  await recordDeadManSwitchResolution(assessment.sha256);
  const rebaseline = await performIrontechRebaselineVerification();
  const integrity = await syncConstitutionalIntegrityEnforcement(tenantId);

  return {
    ok: rebaseline.ok && !integrity.isConstitutionalEmergency,
    message: rebaseline.ok
      ? "Manual rebaseline complete — constitutional baseline verified and backend lock state cleared."
      : "Backend lock cleared but RE-BASELINE_VERIFICATION did not complete.",
    sha256: rebaseline.sha256,
    backendReset,
    integrity,
  };
}
