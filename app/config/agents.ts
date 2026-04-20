/**
 * Kimbot — simulated adversary / red-team threat injector (not a production workforce agent).
 * Persisted as `ThreatEvent.sourceAgent` on injected pipeline threats.
 *
 * Ironbloom — production Agent (19-agent fleet): CSRD / sustainability ledger (physical units only).
 * Do not use “Ironbloom” labels for Kimbot controls or vice versa.
 */
export const KIMBOT_THREAT_SOURCE_AGENT = "KIMBOT" as const;

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
