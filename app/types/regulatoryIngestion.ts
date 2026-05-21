export type RequirementBlock = {
  blockId: string;
  sectionRef: string;
  title: string;
  body: string;
  effectiveDate: string | null;
  authority: string;
  assetImpact: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
};

export type IngestedRegulationRecord = {
  id: string;
  ingestedAt: string;
  source: "ironsight_crawler" | "ironscribe_drive";
  authority: string;
  title: string;
  sourceUrl: string;
  localPath: string | null;
  sha256: string;
  mimeType: string;
  blocks: RequirementBlock[];
  ironscribeOperator: "IRONSCRIBE_AGENT_5";
};

export type ComparisonDiffRow = {
  requirementId: string;
  authority: string;
  requirementTitle: string;
  requirementText: string;
  tasSection: string | null;
  tasDirectiveLabels: string[];
  status: "ALIGNED" | "GAP";
  diffTone: "green" | "red";
  gapReason: string | null;
};

export type RegulatoryComparisonSnapshot = {
  snapshotId: string;
  generatedAt: string;
  regulationId: string;
  diffRows: ComparisonDiffRow[];
  gapCount: number;
  alignedCount: number;
};

export type ShadowAuditVerdict = {
  regulationId: string;
  wouldFailChaosSimulation: boolean;
  narrative: string;
  chaosScenario: string;
  breachNotificationGapDays: number | null;
};

export type CisoDriftNotification = {
  id: string;
  sentAt: string;
  alertId: string;
  regulationId: string;
  recipientRole: "CISO";
  pulseMessage: string;
  oneClickAmendmentPath: string;
  amendmentPreview: string | null;
};
