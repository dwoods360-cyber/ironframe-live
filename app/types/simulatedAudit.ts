export type SimulatedAuditHotSwap = {
  alertId: string;
  amendmentMarkdown: string;
  virtualTasSha256: string;
  appliedAt: string;
  expiresAt: string;
};

export type SimulatedAuditBacktest = {
  tenantKey: string;
  simulationDate: string;
  scenario: string;
  baseline: {
    maturityScore: number;
    chaosResilience: number;
    containmentMs: number | null;
    probabilisticLiabilityUsd: number;
    governanceDividendUsd: number;
  };
  simulated: {
    maturityScore: number;
    chaosResilience: number;
    containmentMs: number | null;
    probabilisticLiabilityUsd: number;
    governanceDividendUsd: number;
  };
  deltas: {
    maturityScore: number;
    containmentMs: number | null;
    additionalGovernanceDividendUsd: number;
    ironlockContainmentImprovementPct: number | null;
  };
};

export type SimulatedAuditReport = {
  auditId: string;
  alertId: string;
  runAt: string;
  operator: "IRONTALLY_AGENT_19";
  hotSwap: SimulatedAuditHotSwap;
  backtest: SimulatedAuditBacktest;
  narrative: string;
  theoreticalOutcome: string;
  securityPostureMaintained: boolean;
  constitutionalHashPromoted: boolean;
  proposedConstitutionalSha256: string | null;
  previousConstitutionalSha256: string | null;
  complianceGapsClosed: string[];
};
