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
  if (s === "INFIL_CRED_STUFFING" || s === "INFIL_LATERAL_PIVOT") {
    return "Control: NIST PR.AC-7 (User / privileged account abuse)";
  }
  if (s === "PHISH_CEO_FRAUD" || s === "PHISH_IT_HELPDESK") {
    return "Control: SOC 2 CC1.2 (Fraud / phishing awareness)";
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
  if (s === "INFIL_CRED_STUFFING" || s === "INFIL_LATERAL_PIVOT") return ["NIST"];
  if (s === "PHISH_CEO_FRAUD" || s === "PHISH_IT_HELPDESK") return ["SOC2"];
  return isChaosTest ? ["NIST"] : [];
}

/** Live ThreatEvent / dashboard strip — map persisted controls to overlay badges. */
export function frameworkBadgesForProductionThreat(
  complianceFramework: string | null | undefined,
  mappedControls: readonly string[],
): FrameworkBadgeKind[] {
  const badges = new Set<FrameworkBadgeKind>();
  const fw = (complianceFramework ?? "").trim().toUpperCase();
  if (fw.includes("SOC")) badges.add("SOC2");
  if (fw.includes("ISO")) badges.add("ISO");
  if (fw.includes("NIST") || fw.includes("CMMC") || fw.includes("FISMA")) badges.add("NIST");
  for (const raw of mappedControls) {
    const c = raw.trim().toUpperCase();
    if (!c) continue;
    if (c.includes("SOC") || (c.includes("CC") && c.includes("."))) badges.add("SOC2");
    if (c.includes("ISO") || /^A\.\d/.test(c)) badges.add("ISO");
    if (c.includes("NIST") || c.includes("CMMC") || /^(AC|AU|IA|SC|SI|PR|CP)-/.test(c)) {
      badges.add("NIST");
    }
  }
  if (badges.size === 0 && mappedControls.length > 0) badges.add("NIST");
  return [...badges];
}

/** Live production overlay label — tenant-scoped ThreatEvent controls (presentation only). */
export function productionComplianceCoverageLabel(
  complianceFramework: string | null | undefined,
  mappedControls: readonly string[],
): string | null {
  const controls = mappedControls.map((c) => c.trim()).filter(Boolean);
  if (controls.length === 0 && !complianceFramework?.trim()) return null;
  const fw = (complianceFramework ?? "NIST").trim().toUpperCase();
  if (controls.length === 0) return `Framework: ${fw}`;
  const preview = controls.slice(0, 2).join(", ");
  const suffix = controls.length > 2 ? ` (+${controls.length - 2})` : "";
  return `Control: ${fw} ${preview}${suffix}`;
}

/** Optional CMMC / defense shield line surfaced when overlay is on (simulation or governed ingest). */
export function extractRegulatoryShieldBadge(mappedControls: readonly string[]): string | null {
  for (const raw of mappedControls) {
    const t = raw.trim();
    if (!t) continue;
    if (/CMMC|REGULATORY SHIELD|🛡️/i.test(t)) return t;
  }
  return null;
}

export function resolveThreatComplianceOverlay(input: {
  showCompliance: boolean;
  chaosScenario: string | null;
  isChaosTest: boolean;
  complianceFramework?: string | null;
  mappedControls?: readonly string[];
  regulatoryShieldBadge?: string | null;
}): {
  complianceCoverageLabel: string | null;
  frameworkBadges: FrameworkBadgeKind[];
  regulatoryShieldBadge: string | null;
  showFrameworkOverlay: boolean;
  showCoveragePill: boolean;
  showRegulatoryShield: boolean;
} {
  const mappedControls = input.mappedControls ?? [];
  const chaosPath = input.isChaosTest || Boolean(input.chaosScenario);
  const chaosBadges = frameworkBadgesForChaosScenario(input.chaosScenario, input.isChaosTest);
  const productionBadges = frameworkBadgesForProductionThreat(input.complianceFramework, mappedControls);
  const frameworkBadges = chaosPath && chaosBadges.length > 0 ? chaosBadges : productionBadges;
  const chaosLabel = chaosComplianceCoverageLabel(input.chaosScenario, input.isChaosTest);
  const productionLabel = productionComplianceCoverageLabel(input.complianceFramework, mappedControls);
  const complianceCoverageLabel =
    chaosPath && chaosLabel ? chaosLabel : productionLabel ?? chaosLabel;
  const regulatoryShieldBadge =
    input.regulatoryShieldBadge?.trim() ||
    extractRegulatoryShieldBadge(mappedControls) ||
    null;
  const showFrameworkOverlay = input.showCompliance && frameworkBadges.length > 0;
  return {
    complianceCoverageLabel,
    frameworkBadges,
    regulatoryShieldBadge,
    showFrameworkOverlay,
    showCoveragePill: input.showCompliance && Boolean(complianceCoverageLabel),
    showRegulatoryShield: input.showCompliance && Boolean(regulatoryShieldBadge),
  };
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
