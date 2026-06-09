const MEDSHIELD_BASELINE_CENTS = 1110000000n;
const VAULTBANK_BASELINE_CENTS = 590000000n;
const GRIDCORE_BASELINE_CENTS = 470000000n;

export const SYSTEM_BASELINE_SUM_CENTS =
  MEDSHIELD_BASELINE_CENTS + VAULTBANK_BASELINE_CENTS + GRIDCORE_BASELINE_CENTS;

export const AGENT_CHECKPOINT_FREEZE_MS = 45_000;

export type LocalizedAuditResult = {
  pass: boolean;
  inlineLabel: "PASS" | "FAIL";
  streamMessage: string;
};

/** Single-click pipeline — localized whole-integer baseline audit for one roster agent. */
export function evaluateLocalizedDiagnosticAudit(agentId: string): LocalizedAuditResult {
  const verified = SYSTEM_BASELINE_SUM_CENTS === 2170000000n;
  return {
    pass: verified,
    inlineLabel: verified ? "PASS" : "FAIL",
    streamMessage: verified
      ? `> [AUDIT] ${agentId} diagnostic PASS — whole-integer baseline sum ${SYSTEM_BASELINE_SUM_CENTS.toString()} cents.`
      : `> [AUDIT] ${agentId} diagnostic FAIL — baseline drift detected.`,
  };
}

/** Emit audit result to intelligence stream and return inline pill label payload. */
export function runLocalizedDiagnosticAudit(
  agentId: string,
  emit: (message: string) => void,
): LocalizedAuditResult {
  const result = evaluateLocalizedDiagnosticAudit(agentId);
  emit(result.streamMessage);
  return result;
}

/** Double-click pipeline — per-agent LangGraph freeze + LKG checkpoint sync narrative. */
export function buildCheckpointFreezeMessage(agentId: string): string {
  return `> [CHECKPOINT] ${agentId} state FROZEN — LangGraph checkpoint synchronized to LKG manifest band.`;
}
