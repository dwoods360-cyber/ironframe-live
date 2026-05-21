import "server-only";

import prisma from "@/lib/prisma";
import { readGovernanceMaturityStateSync } from "@/app/lib/governanceMaturityState";
import { getRequiredForensicAttestationMin } from "@/app/utils/tasFingerprint";
import { validateForensicJustification } from "@/app/utils/validateJustification";
import { IRONLOCK_REJECTION_FIDELITY_MESSAGE } from "@/app/utils/ironlockRejectionMessages";

/** Product default — overridden by {@link getRequiredForensicAttestationMin} (governance + constitutional). */
export const IRONLOCK_FORENSIC_MIN_NORMAL = 50;

/** Ironwatch Stale Data floor (Ironlock Agent 6 + governance alignment). */
export const IRONLOCK_FORENSIC_MIN_STALE_DATA = 100;

export { IRONLOCK_REJECTION_FIDELITY_MESSAGE };

/** Source of truth: DB row (Ironwatch). */
export async function getSustainabilityApiDegradedAsync(): Promise<boolean> {
  try {
    const row = await prisma.systemConfig.findUnique({
      where: { id: "global" },
      select: { sustainabilityLiveApiDegraded: true },
    });
    return row?.sustainabilityLiveApiDegraded === true;
  } catch {
    return false;
  }
}

/** Hot path: last persisted maturity snapshot (synced with Ironwatch on recalc). */
export function getSustainabilityApiDegradedSync(): boolean {
  return readGovernanceMaturityStateSync().current.apiOutagePenaltyActive === true;
}

/**
 * Effective minimum justification length for forensic / neutralize paths.
 * `getRequiredForensicAttestationMax` merges constitutional void bar with governance `neutralizeMinChars`
 * (50 / 75 / 100 including Ironwatch Stale Data).
 */
export function getMinJustificationLengthSync(): number {
  return getRequiredForensicAttestationMin();
}

export type JustificationValidationOutcome =
  | { ok: true; minRequired: number; trimmed: string }
  | {
      ok: false;
      minRequired: number;
      trimmed: string;
      error: string;
      httpStatus: number;
    };

/**
 * Ironlock forensic gate — length (API-aware) + {@link validateForensicJustification} quality.
 * Returns HTTP status: **422** when Stale Data length fails (fidelity); **403** otherwise for short text.
 */
export function validateJustification(text: string | null | undefined): JustificationValidationOutcome {
  const trimmed = (text ?? "").trim();
  const minRequired = getMinJustificationLengthSync();
  const stale = getSustainabilityApiDegradedSync();

  if (trimmed.length < minRequired) {
    if (stale) {
      return {
        ok: false,
        minRequired,
        trimmed,
        error: IRONLOCK_REJECTION_FIDELITY_MESSAGE,
        httpStatus: 422,
      };
    }
    return {
      ok: false,
      minRequired,
      trimmed,
      error: `Insufficient Forensic Justification (${minRequired} characters required).`,
      httpStatus: 403,
    };
  }

  const quality = validateForensicJustification(trimmed, minRequired);
  if (!quality.ok) {
    return {
      ok: false,
      minRequired,
      trimmed,
      error: "IRONLOCK REJECTION: Forensic justification failed quality or entropy checks.",
      httpStatus: 422,
    };
  }

  return { ok: true, minRequired, trimmed };
}

/** Merge into THREAT_RESOLVED / neutralize `AuditLog.justification` JSON during Stale Data. */
export function getHighScrutinyAuditFields(): {
  scrutinyTag?: "[HIGH_SCRUTINY_FALLBACK]";
  ironlockWitnessNote?: string;
} {
  if (!getSustainabilityApiDegradedSync()) return {};
  return {
    scrutinyTag: "[HIGH_SCRUTINY_FALLBACK]",
    ironlockWitnessNote:
      "Ironlock (Agent 6): forensic justification threshold elevated to 100 characters because Ironwatch reports external sustainability live data stale — attestation bar raised for non-repudiation until fidelity restored.",
  };
}
