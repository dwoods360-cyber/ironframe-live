/** Unified GRC risk ingestion queue lifecycle (matches `RiskRegistry.lifecycleStatus`). */
export type RiskLifecycleStatus = "INGESTED" | "REGISTERED" | "ACTIVE" | "RESOLVED";

export const RISK_LIFECYCLE_ORDER: RiskLifecycleStatus[] = [
  "INGESTED",
  "REGISTERED",
  "ACTIVE",
  "RESOLVED",
];

export type RiskRegistryRecord = {
  id: string;
  tenantId: string;
  title: string;
  telemetryValue: string;
  deltaLabel: string;
  sourceAgent: string;
  lifecycleStatus: RiskLifecycleStatus;
  riskEventId: string | null;
  /** JSON string after server sanitization (never a raw Prisma object). */
  ingestionDetails: string | null;
  createdAt: string;
  updatedAt: string;
  /** ISO instant when the row entered RESOLVED (server uses `updatedAt`; client may stamp earlier). */
  resolvedAt?: string | null;
};

export function isIngressLifecycleStatus(status: RiskLifecycleStatus): boolean {
  return status === "INGESTED" || status === "REGISTERED";
}

export function isActiveStackLifecycleStatus(status: RiskLifecycleStatus): boolean {
  return status === "ACTIVE";
}
