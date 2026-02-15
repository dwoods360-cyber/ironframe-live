export type RiskAcceptanceDecision = {
  id: string;
  alertId: string;
  actor: string;
  decision: "DISMISS/IGNORE";
  reason: string;
  createdAt: string;
};

const decisionLog: RiskAcceptanceDecision[] = [];

export function addRiskAcceptanceDecision(entry: RiskAcceptanceDecision) {
  decisionLog.unshift(entry);
}

export function getRiskAcceptanceDecisions() {
  return decisionLog.slice(0, 200);
}
