import "server-only";

import { activeDriftAlerts, readComplianceDriftState } from "@/app/lib/complianceDriftState";

export const COMPLIANCE_DRIFT_MATURITY_PENALTY = 1.5;
export const COMPLIANCE_DRIFT_URGENCY_DAYS = 30;

export type ComplianceDriftPenaltySnapshot = {
  penaltyPoints: number;
  activeUrgentDrifts: number;
  reasons: string[];
};

/**
 * Task 5 — Active regulatory drift with deadline &lt;30 days reduces maturity by 1.5.
 */
export async function getActiveComplianceDriftMaturityPenalty(): Promise<ComplianceDriftPenaltySnapshot> {
  const state = await readComplianceDriftState();
  const active = activeDriftAlerts(state);
  const urgent = active.filter((a) => {
    const days = Math.ceil((Date.parse(a.deadline) - Date.now()) / (24 * 60 * 60 * 1000));
    return days < COMPLIANCE_DRIFT_URGENCY_DAYS;
  });

  if (urgent.length === 0) {
    return { penaltyPoints: 0, activeUrgentDrifts: 0, reasons: [] };
  }

  return {
    penaltyPoints: COMPLIANCE_DRIFT_MATURITY_PENALTY,
    activeUrgentDrifts: urgent.length,
    reasons: urgent.map(
      (a) =>
        `[COMPLIANCE_DRIFT] ${a.pulseMessage} (${a.severity}, deadline ${a.deadline.slice(0, 10)})`,
    ),
  };
}
