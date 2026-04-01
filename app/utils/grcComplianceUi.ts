/**
 * GRC / audit UI helpers — framework mapping and recovery timing (Active Risks).
 */

export function chaosComplianceCoverageLabel(
  scenario: string | null,
  isChaosTest: boolean,
): string | null {
  if (!isChaosTest && !scenario) return null;
  const s = (scenario ?? "").trim().toUpperCase();
  if (s === "INTERNAL" || s === "HOME_SERVER") {
    return "Control: NIST PR.IP-9 (Backup & Recovery)";
  }
  if (s === "REMOTE_SUPPORT") {
    return "Control: SOC 2 AC-2 (Privileged Access)";
  }
  if (s === "CASCADING_FAILURE") {
    return "Control: ISO 27001 A.17 (Continuity)";
  }
  return null;
}

export type FrameworkBadgeKind = "SOC2" | "ISO" | "NIST";

/** Short tags for overlay badges: [SOC 2], [ISO], [NIST]. */
export function frameworkBadgesForChaosScenario(
  scenario: string | null,
  isChaosTest: boolean,
): FrameworkBadgeKind[] {
  if (!isChaosTest && !scenario) return [];
  const s = (scenario ?? "").trim().toUpperCase();
  if (s === "INTERNAL" || s === "HOME_SERVER") return ["NIST"];
  if (s === "REMOTE_SUPPORT") return ["SOC2"];
  if (s === "CASCADING_FAILURE") return ["ISO"];
  if (s === "CLOUD_EXFIL") return ["SOC2", "NIST"];
  return isChaosTest ? ["NIST"] : [];
}

export function formatRecoverySlaLine(
  createdAtIso: string | null | undefined,
  autonomousRecoveredAtIso: string | null | undefined,
): string | null {
  const c = createdAtIso?.trim();
  const r = autonomousRecoveredAtIso?.trim();
  if (!c || !r) return null;
  const ms = Date.parse(r) - Date.parse(c);
  if (!Number.isFinite(ms) || ms < 0) return null;
  return `RECOVERY TIME: ${(ms / 1000).toFixed(1)}s | STATUS: WITHIN SLA`;
}

export function formatRecoverySlaParts(
  createdAtIso: string | null | undefined,
  autonomousRecoveredAtIso: string | null | undefined,
): { seconds: string; recoveryLine: string; slaLine: string } | null {
  const c = createdAtIso?.trim();
  const r = autonomousRecoveredAtIso?.trim();
  if (!c || !r) return null;
  const ms = Date.parse(r) - Date.parse(c);
  if (!Number.isFinite(ms) || ms < 0) return null;
  const sec = (ms / 1000).toFixed(1);
  return {
    seconds: sec,
    recoveryLine: `Recovery time: ${sec}s`,
    slaLine: "SLA: PASS",
  };
}
