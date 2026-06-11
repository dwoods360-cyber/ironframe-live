/** Canonical 0-based functional index for the dashboard left panel (see docs/qa/left-panel-functional-index.md). */
export const LEFT_PANEL_FEATURE_COUNT = 33;

/** Sequential ids 0..32 — one badge per indexed left-rail feature. */
export const LEFT_PANEL_FEATURE_INDICES: readonly number[] = Array.from(
  { length: LEFT_PANEL_FEATURE_COUNT },
  (_, i) => i,
);

export function isValidLeftPanelFeatureIndex(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < LEFT_PANEL_FEATURE_COUNT;
}

export const LP_FEATURE = {
  CONTROL_ROOM_HEADER: 0,
  QUICK_NAV: 1,
  CHAOS_METER: 2,
  IDENTITY_TOGGLE: 3,
  COMPLIANCE_OVERLAY: 4,
  AUTOMATED_UPDATES: 5,
  AUDIT_VERIFIED: 6,
  THREATS_RESOLVED: 7,
  MANAGE_ENDPOINTS: 8,
  CONFIG_CHURN: 9,
  AGENT_STATUS_PULSE: 10,
  PULSE_GESTURES: 11,
  WORKFORCE_OVERLAY: 12,
  AGENT_LOG_INSPECTOR: 13,
  REVIEW_QUEUE: 14,
  META_AUDIT_CONSOLE: 15,
  SIMULATION_BOTS: 16,
  CHAOS_DEPLOY: 17,
  STRATEGIC_STATUS: 18,
  IRONWATCH_ALERT: 19,
  STRATEGIC_INTEL_HEADER: 20,
  INDUSTRY_PROFILE: 21,
  RISK_EXPOSURE: 22,
  ANALYST_MATURATION: 23,
  THREAT_LIBRARY: 24,
  ACTIVE_AGENTS_SHOWCASE: 25,
  LIVE_INTELLIGENCE_STREAM: 26,
  EXPERT_MODE_COUPLING: 27,
  SECURE_TERMINAL: 28,
  TTL_CONTROLS: 29,
  SENTINEL_INSTRUCTION: 30,
  SENTINEL_MODAL: 31,
  AUDITOR_VIEW: 32,
} as const;
