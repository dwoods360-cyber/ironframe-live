import type { TenantKey } from "@/app/utils/tenantIsolation";

export type RemediationTask = {
  id: string;
  assetId: string;
  remediationType: string;
  title: string;
  savings: number;
  riskReductionM: number;
};

export const REMEDIATION_TASKS_BY_ENTITY: Record<TenantKey, RemediationTask[]> = {
  medshield: [
    { id: "medshield-task-tech", assetId: "ms-telehealth-v3", remediationType: "TECHNICAL_FIX", title: "Enforce FIPS-140-3 on Medshield Edge Nodes", savings: 1800000, riskReductionM: 2.5 },
    { id: "medshield-task-policy", assetId: "ms-telehealth-v3", remediationType: "POLICY_FIX", title: "Update Vendor SLA to mandate 24hr patching", savings: 1600000, riskReductionM: 1.6 },
    { id: "medshield-task-financial", assetId: "ms-telehealth-v3", remediationType: "FINANCIAL_FIX", title: "Re-allocate $50k budget to Identity Access Management", savings: 800000, riskReductionM: 0.8 },
  ],
  vaultbank: [
    { id: "vaultbank-task-tech", assetId: "vb-swift-core", remediationType: "TECHNICAL_FIX", title: "Rotate SWIFT Core credentials and enforce hardware-backed keys", savings: 1200000, riskReductionM: 1.2 },
    { id: "vaultbank-task-policy", assetId: "vb-swift-core", remediationType: "POLICY_FIX", title: "Update Vendor SLA to mandate 24hr patching", savings: 900000, riskReductionM: 0.9 },
    { id: "vaultbank-task-financial", assetId: "vb-swift-core", remediationType: "FINANCIAL_FIX", title: "Re-allocate $50k budget to Identity Access Management", savings: 700000, riskReductionM: 0.7 },
  ],
  gridcore: [
    { id: "gridcore-task-tech", assetId: "gc-scada-terminal", remediationType: "TECHNICAL_FIX", title: "Isolate SCADA Segment", savings: 6000000, riskReductionM: 6.0 },
    { id: "gridcore-task-policy", assetId: "gc-scada-terminal", remediationType: "POLICY_FIX", title: "Update Vendor SLA to mandate 24hr patching", savings: 650000, riskReductionM: 0.65 },
    { id: "gridcore-task-financial", assetId: "gc-scada-terminal", remediationType: "FINANCIAL_FIX", title: "Re-allocate $50k budget to Identity Access Management", savings: 500000, riskReductionM: 0.5 },
  ],
};
