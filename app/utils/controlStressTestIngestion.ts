import type { Prisma } from "@prisma/client";

import { parseIngestionDetailsForMerge } from "@/app/utils/ingestionDetailsMerge";

/** Control-gap stress tests always persist on `RiskEvent` even when the UI reads `ThreatEvent`. */
export function isControlStressTestIngestion(
  ingestionDetails: string | Prisma.JsonValue | null | undefined,
): boolean {
  try {
    const j = parseIngestionDetailsForMerge(ingestionDetails ?? null) as Record<string, unknown>;
    if (j.controlStressTest === true) return true;
    const intake = j.sentinelIntake;
    if (intake && typeof intake === "object" && !Array.isArray(intake)) {
      return (intake as Record<string, unknown>).verificationPhaseRequired === true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Cards that feed Evidence Vault readiness / examiner-grade closure use the forensic
 * Neutralize lane only — not the amber RESOLVE THREAT administrative shortcut.
 */
export function requiresForensicNeutralizeClosure(
  ingestionDetails: string | Prisma.JsonValue | null | undefined,
): boolean {
  return isControlStressTestIngestion(ingestionDetails);
}
