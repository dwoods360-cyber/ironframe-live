/**
 * Kimbot — simulated adversary / red-team threat injector (not a production workforce agent).
 * Persisted as `ThreatEvent.sourceAgent` on injected pipeline threats.
 *
 * Ironbloom — production Agent (19-agent fleet): CSRD / sustainability ledger (physical units only).
 * Do not use “Ironbloom” labels for Kimbot controls or vice versa.
 */
export const KIMBOT_THREAT_SOURCE_AGENT = "KIMBOT" as const;

export type CoreWorkforceAgent = {
  index: number;
  name: string;
  label: string;
  dataSource: string;
};

/** Constitutional Blue Team roster (strict 01-19 indexing). */
export const CORE_WORKFORCE_AGENTS: readonly CoreWorkforceAgent[] = [
  { index: 1, name: "Ironcore", label: "01 — Ironcore", dataSource: "ThreatEvent" },
  { index: 2, name: "Ironwave", label: "02 — Ironwave", dataSource: "AgentLog" },
  { index: 3, name: "Irontrust", label: "03 — Irontrust", dataSource: "compliance_snapshots" },
  { index: 4, name: "Irontech", label: "04 — Irontech", dataSource: "AgentOperation" },
  { index: 5, name: "Ironscribe", label: "05 — Ironscribe", dataSource: "audit_exports" },
  { index: 6, name: "Ironlock", label: "06 — Ironlock", dataSource: "QuarantineRecord" },
  { index: 7, name: "Ironcast", label: "07 — Ironcast", dataSource: "AuditLog" },
  { index: 8, name: "Ironsight", label: "08 — Ironsight", dataSource: "ThreatEvent" },
  { index: 9, name: "Ironlogic", label: "09 — Ironlogic", dataSource: "governance_settings" },
  { index: 10, name: "Ironmap", label: "10 — Ironmap", dataSource: "Vendor" },
  { index: 11, name: "Ironintel", label: "11 — Ironintel", dataSource: "ThreatEvent" },
  { index: 12, name: "Ironguard", label: "12 — Ironguard", dataSource: "BotAuditLog" },
  { index: 13, name: "Ironwatch", label: "13 — Ironwatch", dataSource: "IronwatchLog" },
  { index: 14, name: "Irongate", label: "14 — Irongate", dataSource: "ThreatEvent" },
  { index: 15, name: "Ironquery", label: "15 — Ironquery", dataSource: "ThreatEvent" },
  { index: 16, name: "Ironscout", label: "16 — Ironscout", dataSource: "Ironscout_Tasks" },
  { index: 17, name: "Ironbloom", label: "17 — Ironbloom", dataSource: "SustainabilityMetric" },
  { index: 18, name: "Ironethic", label: "18 — Ironethic", dataSource: "governance_policy_history" },
  { index: 19, name: "Irontally", label: "19 — Irontally", dataSource: "audit_exports" },
] as const;

/** Same as `KIMBOT_THREAT_SOURCE_AGENT` — use when creating Kimbot-sourced threats server-side. */
export const KIMBOT_SOURCE = KIMBOT_THREAT_SOURCE_AGENT;

/** UI copy only — production sustainability / CSRD attribution (not a `sourceAgent` value for Kimbot threats). */
export const IRONBLOOM_PRODUCTION_LABEL = "Ironbloom" as const;

/** @deprecated DB / titles from pre–Epic 11 builds */
export const LEGACY_KIMBOT_THREAT_SOURCE_AGENT = "IRONBLOOM" as const;

/** Prefix on simulated threat titles (matches `sourceAgent` branding). */
export const KIMBOT_THREAT_TITLE_PREFIX = "[KIMBOT]" as const;

/** @deprecated Pre–Epic 11 title prefix in persisted / in-flight threats */
export const LEGACY_KIMBOT_THREAT_TITLE_PREFIX = "[IRONBLOOM]" as const;

/** GRC bot — pipeline titles and `ThreatEvent.sourceAgent`. */
export const GRC_THREAT_TITLE_PREFIX = "[GRC]" as const;
export const GRC_SOURCE = "GRC_BOT" as const;

/**
 * Attack / chaos simulation (ATTBOT + IRONCHAOS-style drills).
 * Persisted as `ThreatEvent.sourceAgent`; legacy rows may still read `IRONCHAOS` or `ATTBOT_SIMULATION`.
 */
export const ATTACK_THREAT_TITLE_PREFIX = "[ATTACK]" as const;
export const ATTACK_SOURCE = "ATTACK_BOT" as const;
