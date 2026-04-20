/** Persisted chaos drill shadow telemetry (`ingestionDetails.chaosShadowAuditLog` + `chaosAssigneeHandoffHistory`). */

/** TAS §2 DMZ — Agent 14 (Irongate) — persisted assignee id on ThreatEvent / SimThreatEvent. */
export const CHAOS_ASSIGNEE_IRONGATE_14 = "IRONGATE_14";
/** Irontech — Agent 11. */
export const CHAOS_ASSIGNEE_IRONTECH_11 = "IRONTECH_11";
/** Resolution / promotion. */
export const CHAOS_ASSIGNEE_SYSTEM = "SYSTEM";

/** T-0s — Irongate DMZ (amber). */
export const CHAOS_SHADOW_AUDIT_BIRTH =
  "[IRONGATE] Sanitizing ingress. Identity verified. Tenant ID strictly stamped.";

/** T-4s — Irontech analysis (white). `scenarioDisplayName` = exact dropdown label (card title). */
export function chaosShadowAuditAnalyzedLine(scenarioDisplayName: string): string {
  const s = scenarioDisplayName.trim().replace(/\s+/g, " ").slice(0, 240) || "CHAOS_DRILL";
  return `[IRONTECH] Analyzing payload: ${s}. LangGraph checkpointing active.`;
}

/** T-8s — observation phase (amber). */
export const CHAOS_SHADOW_AUDIT_OBSERVATION =
  "[IRONTECH] Self-healing protocol staged. Awaiting observer concurrence...";

/** T-12s — SYSTEM conclusion (amber). */
export const CHAOS_SHADOW_AUDIT_SYSTEM_CONCLUSION =
  "[SYSTEM] Process complete. Conclusion: Remediation Successful. Concurrence Verified.";

/** Directive ids persisted on each handoff (GRC audit). */
export const CHAOS_DIRECTIVE = {
  T0_DMZ_SANITIZE: "DMZ_IRONGATE_SANITIZE_STAMP_TENANT",
  T4_ANALYSIS: "IRONTECH_LANGGRAPH_PAYLOAD_ANALYSIS",
  T8_OBSERVATION: "IRONTECH_SELF_HEAL_STAGED_AWAIT_OBSERVER",
  T12_SYSTEM_CONCLUSION: "SYSTEM_REMEDIATION_CONCURRENCE_VERIFIED",
  /** Written on successful `acknowledgeThreatAction` for chaos rows (final operator/GRC handoff). */
  FINAL_GRC_ACK: "SYSTEM_GRC_ACK_PROMOTE_ACTIVE_RISKS",
} as const;
