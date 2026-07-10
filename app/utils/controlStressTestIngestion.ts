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

/** Row-level control stress signal (ingestion JSON or Sentinel / Control Stress Test title). */
export function isControlStressThreatRecord(row: {
  ingestionDetails?: string | Prisma.JsonValue | null;
  title?: string | null;
  targetEntity?: string | null;
  sourceAgent?: string | null;
}): boolean {
  if (isControlStressTestIngestion(row.ingestionDetails)) return true;
  if ((row.sourceAgent ?? "").trim().toUpperCase() !== "HUMAN_SENTINEL") return false;
  const title = (row.title ?? "").trim();
  const target = (row.targetEntity ?? "").trim();
  return title.includes("Control Stress Test") || target.includes("Control Stress Test");
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
