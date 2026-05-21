export type MaturityComponentScores = {
  attestationQuality: number;
  chaosResilience: number;
  directivity: number;
};

export type MaturityTrendPoint = {
  date: string;
  score: number;
  components: MaturityComponentScores;
};

export type GovernanceMaturitySnapshot = {
  score: number;
  /** Weighted score before self-healing resilience bonus (if any). */
  scoreBeforeResilienceBonus?: number;
  /** +0.5 when autonomous self-healing has been continuous ≥30 days (capped in score). */
  selfHealingResilienceBonus?: number;
  /** +0.2 when EPA SCC-weighted societal slice exceeds internal ALE on recent metrics (Ironethic). */
  ironethicEthicsBonus?: number;
  selfHealingContinuity?: {
    daysActive: number;
    activeSince: string | null;
    bonusApplies: boolean;
  };
  calculatedAt: string;
  components: MaturityComponentScores;
  weights: { attestation: number; chaos: number; directivity: number };
  governanceDegradationActive: boolean;
  neutralizeMinChars: number;
  sampleSizes: {
    resolutionsSampled: number;
    chaosReportAvailable: boolean;
  };
  /** Ironwatch (Agent 15): external sustainability live API stale ≥4h — final score includes this penalty. */
  apiOutagePenaltyActive?: boolean;
  apiOutagePenaltyPoints?: number;
  /** Irontech (Agent 12): +0.3 per autonomous self-healing intervention (cap 1.5) in trailing 30d, no manual override. */
  irontechAutonomyBonus?: number;
  sustainabilityStaleLockdownFrozen?: boolean;
  sustainabilityStaleLockdownPenaltyPoints?: number;
  /** Irontrust (Agent 3): maturity reduction from quarantine ledger rows targeting this tenant (strike-2 / hard ban). */
  targetedAdversarialMaturityPenalty?: number;
  notes?: string[];
};

export type GovernanceMaturityState = {
  current: GovernanceMaturitySnapshot;
  trend: MaturityTrendPoint[];
};
