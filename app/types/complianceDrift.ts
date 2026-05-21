export type RegulatoryDriftSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RegulatoryDriftStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";

export type RegulatoryHorizonItem = {
  id: string;
  label: string;
  deadline: string;
  authority: string;
  frameworkRef: string;
  daysRemaining: number;
};

export type RegulatoryDriftAlert = {
  id: string;
  detectedAt: string;
  source: string;
  sourceUrl: string;
  lawSummary: string;
  lawExcerpt: string;
  tasSection: string;
  tasSectionTitle: string;
  tasAnchorId: string;
  tasLine: number;
  tasCurrentPosture: string;
  agentLabel: string;
  isDriftDetected: boolean;
  severity: RegulatoryDriftSeverity;
  deadline: string;
  status: RegulatoryDriftStatus;
  pulseMessage: string;
  keywordHits: string[];
  obligationId: string;
  amendmentDraftId?: string;
};

export type ComplianceDriftState = {
  lastPollAt: string | null;
  horizons: RegulatoryHorizonItem[];
  alerts: RegulatoryDriftAlert[];
  pollStats: {
    sourcesPolled: number;
    itemsScanned: number;
    keywordsMatched: number;
    newAlerts: number;
  };
};
