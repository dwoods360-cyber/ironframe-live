import type { ThreatState } from "@prisma/client";

export type OpSupportWorkspaceTab = "ingestion" | "simAudit" | "diagnostic";

export type OpSupportDiagnosticFailureEvent = {
  logId: string;
  reportId: string;
  createdAt: string;
  comment: string;
  gitRevision: string | null;
  geminiRepairPacket: string;
  severityLabel: string;
  threatId?: string;
  threatTitle?: string;
  threatStatus: string;
  likelihood: number;
  impact: number;
  ingestionDetails: string | null;
};

export type OpSupportDiagnosticComponentRow = {
  sourceComponentPath: string;
  passCount: number;
  failCount: number;
  /** Weighted sum: +1 per pass, −10/−5/−2 per deficiency by severity. */
  healthPoints: number;
  /** 0–100 bar fill (emerald-heavy when high). */
  healthBarPercent: number;
  /** Pass ratio (passes / passes + fails); informational. */
  reliabilityScore: number | null;
  latestDeficiencyComment: string | null;
  /** Git SHA from the most recent deficiency (failure) for this component. */
  lastFailureGitRevision: string | null;
  lastFailureAt: string | null;
  /** Mean seconds from deficiency `createdAt` to `resolvedAt` (resolved samples only). */
  avgTtrSeconds: number | null;
  /** Count of resolved deficiencies used for `avgTtrSeconds`. */
  ttrSampleCount: number;
  failures: OpSupportDiagnosticFailureEvent[];
};

export type OpSupportClearanceCard = {
  id: string;
  title: string;
  status: ThreatState;
  sourceAgent: string;
  targetEntity: string;
  score: number;
  financialRisk_cents: string;
  createdAt: string;
  updatedAt: string;
  tenantCompanyId: string | null;
  companyName: string | null;
  isTestCompany: boolean;
  dispositionStatus: string | null;
  isFalsePositive: boolean;
  receiptHash: string | null;
  ingestionDetails: string | null;
};

export type OpSupportSimAuditRow = {
  id: string;
  createdAt: string;
  action: string;
  operatorId: string;
  isSimulation: boolean;
  threatId: string | null;
  justificationPreview: string;
};

export type OpSupportDeficiencyItem = {
  reportId: string;
  auditLogId: string;
  threatId: string | null;
  createdAt: string;
  commentPreview: string;
  /** Snapshot severity at filing time (`MEDIUM` | `HIGH` | `CRITICAL`). */
  severityLabel: string;
};
