import "server-only";

import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import { SYSTEM_OWNER_ID } from "@/app/config/constitutionalAuthority";
import {
  POSTURE_DEGRADATION_COMPLETE_ACTION,
} from "@/app/config/postureDegradation";
import { SECURITY_POSTURE_DUAL_LOCK } from "@/app/config/securityPosture";
import { generateNewEmergencySeal } from "@/app/lib/emergencySeal";
import { writePostureDegradationWorkflow } from "@/app/lib/postureDegradationWorkflow";
import {
  broadcastConstitutionalFingerprintToWorkforce,
  getTasFingerprintSnapshot,
  performIrontechRebaselineVerification,
} from "@/app/utils/tasFingerprint";

const CONFIG_DEGRADATION_ACTION = "CONFIG_DEGRADATION_EVENT";

/**
 * After 24h cool-down: apply DUAL_LOCK, regenerate seal, re-baseline, broadcast new constitutional hash.
 */
export async function executePostureDegradationFinalization(
  justification: string,
): Promise<
  | { ok: true; constitutionalHash: string; sealGeneratedAt: string }
  | { ok: false; error: string }
> {
  await generateNewEmergencySeal(SECURITY_POSTURE_DUAL_LOCK);

  const rebaseline = await performIrontechRebaselineVerification();
  const constitutionalHash =
    rebaseline.ok && rebaseline.sha256
      ? rebaseline.sha256
      : getTasFingerprintSnapshot({ forceRefresh: true }).sha256;

  if (constitutionalHash) {
    await broadcastConstitutionalFingerprintToWorkforce(constitutionalHash);
  }

  const just = justification.trim();
  try {
    await auditLogCreateLoose({
      data: {
        action: CONFIG_DEGRADATION_ACTION,
        justification: `[CONFIG_DEGRADATION_EVENT] — Nuclear posture downgraded TRIPARTITE_LOCK → DUAL_LOCK (board-approved) — ${just}`,
        operatorId: SYSTEM_OWNER_ID,
        threatId: null,
        isSimulation: false,
        governance_tenant_uuid: TENANT_UUIDS.medshield,
      },
    });
    await auditLogCreateLoose({
      data: {
        action: POSTURE_DEGRADATION_COMPLETE_ACTION,
        justification: JSON.stringify({
          event: "POSTURE_DEGRADATION_COMPLETE",
          targetPosture: SECURITY_POSTURE_DUAL_LOCK,
          constitutionalHash,
          message:
            "Triple-executive cool-down elapsed. Security posture applied; constitutional hash re-baselined and broadcast.",
        }),
        operatorId: SYSTEM_OWNER_ID,
        threatId: null,
        isSimulation: false,
        governance_tenant_uuid: TENANT_UUIDS.medshield,
      },
    });
  } catch (e) {
    console.error("[executePostureDegradationFinalization] audit failed", e);
  }

  await writePostureDegradationWorkflow(null);

  return {
    ok: true,
    constitutionalHash: constitutionalHash ?? "",
    sealGeneratedAt: new Date().toISOString(),
  };
}
