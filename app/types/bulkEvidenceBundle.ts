/**
 * Serializable bulk evidence bundle for broker adapters and Evidence Vault UI.
 * All currency fields are integer cents as decimal strings (BigInt-safe JSON).
 */

export type BulkEvidenceDateRange = {
  startIso: string;
  endIso: string;
};

export type BulkEvidenceRow = {
  riskEventId: string;
  title: string;
  status: string;
  updatedAtIso: string;
  complianceFramework: string;
  mappedControls: string[];
  hasPostMortemPdf: boolean;
  /** Sum of recorded ALE (`financialRisk_cents`) per row — baseline exposure. */
  aleCents: string;
  potentialLossMitigatedCents: string;
  humanLaborSavingsCents: string;
  valueCreatedCents: string;
  mheHumanHours: number;
  /** Derived: post-mortem on file and terminal closure state. */
  underwriterReady: boolean;
  /** Effective export-control flags (persisted chapter + Defense ITAR/CMMC title rules). */
  isExportControlled: boolean;
  /** Required clearance to view/download when export-controlled (PUBLIC | CONFIDENTIAL | SECRET | TOP_SECRET). */
  requiredClearance: string;
  /** Defense / Aerospace retention policy (365-day validation window). */
  retention?: {
    highRiskSector: boolean;
    /** Countdown within the 365-day window; 0 when overdue. */
    daysRemaining: number;
    pendingShred: boolean;
  };
};

export type BulkEvidenceBundle = {
  tenantUuid: string;
  range: BulkEvidenceDateRange;
  eventCount: number;
  rows: BulkEvidenceRow[];
  totals: {
    /** Σ ALE baseline (`financialRisk_cents`) — “total mitigated ALE” inventory. */
    totalMitigatedAleCents: string;
    /** Σ modeled potential loss (ALE + regulatory uplift). */
    totalPotentialLossCents: string;
    /** Σ MHE × analyst rate (labor savings). */
    totalMheLaborSavingsCents: string;
    totalMheHumanHours: number;
    /** Σ net value created (ROI proxy for the bundle). */
    cumulativeRoiCents: string;
  };
  meta: {
    simulationPlane: boolean;
    generatedAtIso: string;
  };
};
