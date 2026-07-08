/** Hash anchor for Attack Velocity / Threat Pipeline on Command Post. */
export const COMMAND_POST_THREAT_PIPELINE_HASH = "#threat-pipeline";

/** Deep-link Command Post to a control-gap Sentinel case. */
export function buildControlStressCaseHref(threatId: string): string {
  const id = threatId.trim();
  if (!id) return `/${COMMAND_POST_THREAT_PIPELINE_HASH}`;
  return `/?case=${encodeURIComponent(id)}${COMMAND_POST_THREAT_PIPELINE_HASH}`;
}

export const CONTROL_STRESS_RESOLVE_STEPS =
  "Command Post → scroll to Risk Ingestion / Attack Velocity → acknowledge Sentinel Hypothesis: Control Stress Test, then Active Risks → resolve (50+ chars).";

export function controlStressOpenedMessage(controlId: string, threatId: string): string {
  return `Control stress case opened for ${controlId}. ${CONTROL_STRESS_RESOLVE_STEPS} Case ${threatId.slice(0, 8)}…`;
}
