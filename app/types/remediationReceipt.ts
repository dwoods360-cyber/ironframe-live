/** Pre-reset lab impact — captured before DB reset (cents as decimal string on the wire). */
export type RemediationImpactReport = {
  totalRecoveredCents: string;
  affectedCount: number;
  highestValueTarget: string | null;
  timestamp: string;
};
