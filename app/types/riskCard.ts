import type { RiskLifecycleStatus } from "@/app/types/riskLifecycle";

/** Pattern-state lifecycle (risk registry queue). */
export type RiskCardLifecycleStatus = RiskLifecycleStatus;

/** Maturity / integrity strip (governance ingress telemetry). */
export type RiskCardMaturityStatus = "PENDING_INTEGRITY" | "ASSIGNED" | "PROCESSING" | "VERIFIED";

export type RiskCardDisplayStatus = RiskCardLifecycleStatus | RiskCardMaturityStatus;

/** Simulation Bot A–C system-integrity drills (Control Room). */
export type SystemIntegrityDrillKind = "ATTBOT" | "KIMBOT" | "GRCBOT";

export type RiskCardProcessedData = {
  title: string;
  value: string;
  delta: string;
  status: RiskCardDisplayStatus;
  /** Mapped control framework (e.g. SOC 2, NIST, ISO 27001). */
  frameworkLabel?: string;
  /** Governed liability / governed impact (USD display string). */
  governedLiability?: string;
  /** When set, render a high-contrast system-integrity badge (no separate overlay card). */
  systemIntegrityDrill?: SystemIntegrityDrillKind | null;
  /** Linked threat / risk event id (forensic modal header). */
  threatId?: string;
  /** Ironscribe (Agent 5) markdown evidence locker artifact. */
  markdownAuditBlock?: string;
};

export type RiskDeckCardItem = {
  id: string;
  processedData: RiskCardProcessedData;
};

export function isRiskLifecycleCardStatus(
  status: RiskCardDisplayStatus,
): status is RiskCardLifecycleStatus {
  return (
    status === "INGESTED" ||
    status === "REGISTERED" ||
    status === "ACTIVE" ||
    status === "RESOLVED"
  );
}
