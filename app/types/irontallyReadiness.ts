/** Layout matrix row — one attested control tied to ledger telemetry. */
export interface VerifiedEvidenceLog {
  controlId: string;
  agentSignature: string;
  timestamp: string;
  physicalContext: string;
}

/** Per-framework readiness rollup consumed by `/api/grc/irontally?readiness=1`. */
export interface FrameworkReadinessSummary {
  framework: "SOC2" | "ISO27001" | "CSRD" | "EU_AI_ACT" | "DORA" | "NYDFS_500" | "UK_CSR";
  totalControlsMonitored: number;
  passingControlsCount: number;
  verifiedEvidenceLogs: VerifiedEvidenceLog[];
}

export type FrameworkReadinessLabel = FrameworkReadinessSummary["framework"];

export type IrontallyReadinessApiResponse = {
  ok: boolean;
  readiness?: FrameworkReadinessSummary[];
  error?: string;
};
