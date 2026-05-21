import "server-only";

import { createHash } from "crypto";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import {
  setChaosConstitutionalVoid,
  type ChaosConstitutionalVoidRecord,
} from "@/app/lib/chaosConstitutionalVoid";
import { beginChaosRunTelemetry, appendChaosRunEvent } from "@/app/lib/chaosRunTelemetry";
import { armDeadManSwitchOnEmergency } from "@/app/lib/deadMansSwitch";
import {
  applyIronlockConstitutionalFreezeForTenant,
  getTasFingerprintSnapshot,
  invalidateTasFingerprintCache,
} from "@/app/utils/tasFingerprint";

export const CHAOS_CONSTITUTIONAL_COLLAPSE_ACTION = "CHAOS_CONSTITUTIONAL_COLLAPSE";

export type ConstitutionalCollapseChaosResult =
  | {
      ok: true;
      tenantId: string;
      expiresAt: string;
      voidRecord: ChaosConstitutionalVoidRecord;
      threatsFrozen: number;
      shadowFrozen: number;
    }
  | { ok: false; error: string };

/**
 * Chaos drill: per-tenant TAS void, Ironlock freeze, compressed simulation DMS (240s).
 */
export async function triggerConstitutionalCollapseChaos(params: {
  tenantId: string;
  operatorId?: string;
}): Promise<ConstitutionalCollapseChaosResult> {
  const tenantId = params.tenantId?.trim();
  if (!tenantId) {
    return { ok: false, error: "tenantId is required for CONSTITUTIONAL_COLLAPSE." };
  }

  beginChaosRunTelemetry({
    tenantId,
    scenario: "CONSTITUTIONAL_COLLAPSE",
    isSimulation: true,
  });

  const voidRecord = await setChaosConstitutionalVoid(tenantId, {
    simulatedVoidHash: createHash("sha256")
      .update(`CHAOS_VOID:${tenantId}:${Date.now()}`, "utf8")
      .digest("hex"),
  });

  appendChaosRunEvent(tenantId, "TAS_VOID", {
    simulatedVoidHash: voidRecord.simulatedVoidHash,
  });

  invalidateTasFingerprintCache();

  const snap = getTasFingerprintSnapshot({ forceRefresh: true, tenantId });
  if (!snap.isConstitutionalEmergency) {
    return {
      ok: false,
      error: "Chaos void did not surface constitutional emergency for tenant.",
    };
  }

  const freeze = await applyIronlockConstitutionalFreezeForTenant(tenantId);

  const dms = await armDeadManSwitchOnEmergency(tenantId, {
    isSimulation: true,
    forceRearm: true,
  });
  appendChaosRunEvent(tenantId, "DMS_ARMED", {
    expiresAt: dms.expiresAt,
    isSimulation: true,
  });

  try {
    await auditLogCreateLoose({
      data: {
        action: CHAOS_CONSTITUTIONAL_COLLAPSE_ACTION,
        justification: JSON.stringify({
          event: "CONSTITUTIONAL_COLLAPSE",
          tenantId,
          simulatedVoidHash: voidRecord.simulatedVoidHash,
          dmsExpiresAt: dms.expiresAt,
          isSimulation: true,
          tag: "[SIMULATION_DATA]",
        }),
        operatorId: params.operatorId?.trim() || "IRONCHAOS_DRILL",
        threatId: null,
        isSimulation: true,
        governance_tenant_uuid: tenantId,
      },
    });
  } catch (e) {
    console.error("[triggerConstitutionalCollapseChaos] audit failed", e);
  }

  return {
    ok: true,
    tenantId,
    expiresAt: dms.expiresAt,
    voidRecord,
    threatsFrozen: freeze.threatsFrozen,
    shadowFrozen: freeze.shadowFrozen,
  };
}
