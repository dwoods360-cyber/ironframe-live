/**
 * GRC Gold / Ironwatch governance constants (Postgres 18 + Next.js).
 * Import from `@/lib/constants` or `@/lib/constants/grcGovernance`.
 */

/** Normalize Security Profile display name for digital signature comparison (client + server). */
export function normalizeGrcProfileName(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Narrative lines for ALE = SLE × ARO (PDF appendix). */
export const GOVERNANCE_ALE_FORMULA_TITLE = "Mathematical context (risk quantification)";
export const GOVERNANCE_ALE_FORMULA_LINES = [
  "ALE = SLE × ARO",
  "SLE — Single Loss Expectancy: the monetary loss if a single adverse event occurs.",
  "ARO — Annual Rate of Occurrence: the estimated frequency of that event per year.",
] as const;

/** Keywords Agent 13 scans in Saved Information / Evidence Vault narratives (historical memory). */
export const IRONWATCH_HISTORICAL_MEMORY_KEYWORDS = [
  "logistics",
  "ports",
  "port operations",
  "supply chain",
  "freight forwarding",
] as const;

/** Deep link for Ironwatch intelligence match sidebar (evidence gap index). */
export const IRONWATCH_HISTORICAL_CHAPTER_HREF = "/evidence/gaps";

/** Defense industry profile — center pane + Active Risk shield (sync with governed ingest). */
export const DEFENSE_REGULATORY_SHIELD_BADGE_LABEL = "🛡️ 1.6× CMMC L3";

/** Agent 13 attestation line persisted on RiskEvent / ReasoningLog (server getters read this). */
export const IRONWATCH_AGENT13_ATTESTATION_LINE = "Validated against historical baselines.";

/** Resilience Intel stream line for Ironwatch keyword / vault matches. */
export const IRONWATCH_RESILIENCE_INTEL_MATCH_LINE =
  "🛡️ [IRONWATCH] | Intelligence match: prior evidence vault entry suggests reusable control mapping. Review and apply?";

/** Sidebar / HUD — Ironwatch (Agent 13) intelligence match (full UI copy + evidence link). */
export const IRONWATCH_INTEL_MATCH_SIDEBAR =
  "🛡️ [IRONWATCH] | Intelligence match: a comparable control gap was closed in the historical evidence ledger. Apply prior mappings?";

/** Agent 13 — hybrid cosine distance gate (Flemming): semanticDistance = 1 − bestCosine. */
export const IRONWATCH_SEMANTIC_DRIFT_THRESHOLD = 0.4;

export const IRONWATCH_LOW_CONFIDENCE_SEMANTIC_DRIFT =
  "⚠️ LOW CONFIDENCE: Semantic Drift Detected";

/** Agent 13 sub-directive — historical logistics corpus contradicts modern regulatory posture. */
export const IRONWATCH_SHADOW_DISSENT_LABEL = "Shadow Dissent: Logic Anomaly";

/** Agent 13 cross-audit — new ingestion vs closed audit gap / sealed forensic ledger. */
export const IRONWATCH_SHADOW_DISSENT_AUDIT_LABEL = "Shadow Dissent: Audit Inconsistency";

/** Matches disposition text in AuditLog / ledger exports implying a closed or sealed gap. */
export const IRONWATCH_CLOSED_AUDIT_GAP_RE =
  /\b(gap\s*closed|audit\s*gap\s*closed|closed[\s_-]*archived|forensic\s*seal|governance\s+seal|deficiency\s*closed|sealed\s+ledger|remediation\s+complete|post[\s-]*mortem\s*signed|cleared\s+ytd)\b/i;

/** Modern regulatory / assurance posture in justification text (Ironscribe proposal). */
export const IRONWATCH_MODERN_REGULATORY_STRICT_RE =
  /\b(mandatory|must\s+implement|zero\s*trust|full\s+compliance|immediate\s*remediation|cmmc(\s+level)?|itar(\s+control|\s+violation)?|hipaa(\s+breach|\s+violation)?|audit\s*finding|control\s*gap|non[- ]?compliant|remediate\s+within)\b/i;

/** Historical / legacy operations language in Saved Information (contradicts strict modern framing). */
export const IRONWATCH_HISTORICAL_FLEXIBILITY_RE =
  /\b(waiver|grandfather|legacy\s+route|expedited\s+clearance|commercial\s+port|bilateral\s+arrangement|pre[- ]?cmmc|informal\s+handshake|operational\s+exception|carve[- ]?out|risk\s+acceptance|historical\s+exemption)\b/i;

export function matchesIronwatchHistoricalMemoryKeywords(blob: string): boolean {
  const b = blob.toLowerCase();
  return IRONWATCH_HISTORICAL_MEMORY_KEYWORDS.some((term) => b.includes(term));
}
