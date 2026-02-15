export type AssetStatus = "SECURE" | "WARNING" | "VULNERABLE" | "CRITICAL";

import { assertTenantAccess, TENANT_UUIDS, TenantKey } from "@/app/utils/tenantIsolation";

export type EntityAsset = {
  id: string;
  name: string;
  status: AssetStatus;
};

export type EntityData = {
  entityName: string;
  assets: EntityAsset[];
  activeThreats: number;
  policyAttestation: number;
};

export type EntityScoreResult = {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  criticalAssets: number;
  vulnerableAssets: number;
  activeThreats: number;
  policyAttestation: number;
  bonusPoints: number;
};

export type FinancialExposureInput = {
  threatSeverity: number;
  assetValue: number;
  industryMultiplier: number;
};

export type VendorIndustry = "Healthcare" | "Finance" | "Energy";

export type VendorQuestionnaireInput = {
  vendorName: string;
  industry: VendorIndustry;
  mfaEnabled: boolean;
  encryptionEnabled: boolean;
  incidentResponseReady: boolean;
};

export type VendorQuestionnaireResult = {
  entityKey: TenantKey;
  vendorName: string;
  industry: VendorIndustry;
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  potentialFinancialImpact: number;
  mfaEnabled: boolean;
  syncStatus: "MANUAL_FORM" | "LIVE_AWS_SYNC";
  costDrivers: string[];
};

export type FinancialImpactSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type FinancialImpactProfile = {
  avgBreachLiability: number;
  criticalPerEventImpact: number;
};

export type FinancialImpactResult = {
  entity: TenantKey;
  severity: FinancialImpactSeverity;
  avgBreachLiability: number;
  criticalPerEventImpact: number;
  totalImpact: number;
  potentialFine: number;
  complexityMultiplier: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function mapScoreToLetterGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function calculateEntityScore(entityData: EntityData): EntityScoreResult {
  const criticalAssets = entityData.assets.filter((asset) => asset.status === "CRITICAL").length;
  const vulnerableAssets = entityData.assets.filter((asset) => asset.status === "VULNERABLE").length;
  const activeThreats = entityData.activeThreats;

  const baseScore = 100;
  const deductions = criticalAssets * 15 + vulnerableAssets * 10 + activeThreats * 20;
  const bonusPoints = Math.floor(entityData.policyAttestation / 10) * 2;
  const score = clamp(baseScore - deductions + bonusPoints, 0, 100);

  return {
    score,
    grade: mapScoreToLetterGrade(score),
    criticalAssets,
    vulnerableAssets,
    activeThreats,
    policyAttestation: entityData.policyAttestation,
    bonusPoints,
  };
}

export const ENTITY_SCORING_DATA: Record<"medshield" | "vaultbank" | "gridcore", EntityData> = {
  medshield: {
    entityName: "MEDSHIELD",
    assets: [
      { id: "ms-cloud-ehr", name: "Cloud EHR", status: "SECURE" },
      { id: "ms-telehealth-v3", name: "Remote Telehealth V3", status: "VULNERABLE" },
      { id: "ms-inpatient-nodes", name: "In-Patient Nodes", status: "SECURE" },
    ],
    activeThreats: 0,
    policyAttestation: 92,
  },
  vaultbank: {
    entityName: "VAULTBANK",
    assets: [
      { id: "vb-hft-engine", name: "HFT Engine", status: "SECURE" },
      { id: "vb-swift-core", name: "SWIFT Core", status: "CRITICAL" },
      { id: "vb-ledger-v2", name: "Customer Ledger V2", status: "SECURE" },
    ],
    activeThreats: 0,
    policyAttestation: 74,
  },
  gridcore: {
    entityName: "GRIDCORE",
    assets: [
      { id: "gc-substation-v4", name: "Substation Control V4", status: "WARNING" },
      { id: "gc-transmission-node", name: "Transmission Node", status: "SECURE" },
      { id: "gc-scada-terminal", name: "SCADA Master Terminal", status: "VULNERABLE" },
    ],
    activeThreats: 0,
    policyAttestation: 86,
  },
};

export const ENTITY_FINANCIAL_FACTORS: Record<TenantKey, FinancialExposureInput> = {
  medshield: {
    threatSeverity: 3,
    assetValue: 1800000,
    industryMultiplier: 1.3,
  },
  vaultbank: {
    threatSeverity: 5,
    assetValue: 2500000,
    industryMultiplier: 1.6,
  },
  gridcore: {
    threatSeverity: 4,
    assetValue: 2100000,
    industryMultiplier: 1.45,
  },
};

const FINANCIAL_IMPACT_BASELINES: Record<TenantKey, FinancialImpactProfile> = {
  medshield: {
    avgBreachLiability: 11100000,
    criticalPerEventImpact: 1500000,
  },
  vaultbank: {
    avgBreachLiability: 5900000,
    criticalPerEventImpact: 850000,
  },
  gridcore: {
    avgBreachLiability: 4700000,
    criticalPerEventImpact: 600000,
  },
};

const SEVERITY_MULTIPLIER: Record<FinancialImpactSeverity, number> = {
  LOW: 0.35,
  MEDIUM: 0.6,
  HIGH: 0.8,
  CRITICAL: 1,
};

export function buildAggregateEntityData(entities: EntityData[]): EntityData {
  const allAssets = entities.flatMap((entity) => entity.assets);
  const totalActiveThreats = entities.reduce((sum, entity) => sum + entity.activeThreats, 0);
  const avgPolicyAttestation =
    entities.length === 0 ? 0 : Math.round(entities.reduce((sum, entity) => sum + entity.policyAttestation, 0) / entities.length);

  return {
    entityName: "GLOBAL",
    assets: allAssets,
    activeThreats: totalActiveThreats,
    policyAttestation: avgPolicyAttestation,
  };
}

export function calculateFinancialExposure(input: FinancialExposureInput): number {
  return Math.round(input.threatSeverity * input.assetValue * input.industryMultiplier);
}

export function calculateFinancialImpact(
  entity: TenantKey,
  severity: FinancialImpactSeverity,
  options?: { complexityMultiplier?: number; potentialFine?: number },
): FinancialImpactResult {
  const profile = FINANCIAL_IMPACT_BASELINES[entity];
  const complexityMultiplier = options?.complexityMultiplier ?? SEVERITY_MULTIPLIER[severity];
  const potentialFine = options?.potentialFine ?? 0;
  const baseImpact = profile.criticalPerEventImpact;
  const totalImpact = Math.round(baseImpact * complexityMultiplier + potentialFine);

  return {
    entity,
    severity,
    avgBreachLiability: profile.avgBreachLiability,
    criticalPerEventImpact: profile.criticalPerEventImpact,
    totalImpact,
    potentialFine,
    complexityMultiplier,
  };
}

export function getTenantFinancialExposure(activeTenantUuid: string | null, targetTenant: TenantKey): number {
  const targetTenantUuid = TENANT_UUIDS[targetTenant];

  if (!assertTenantAccess(activeTenantUuid, targetTenantUuid)) {
    throw new Error("Tenant isolation violation: attempted to access financial exposure outside active tenant.");
  }

  return calculateFinancialExposure(ENTITY_FINANCIAL_FACTORS[targetTenant]);
}

function mapIndustryToEntityKey(industry: VendorIndustry): TenantKey {
  if (industry === "Healthcare") return "medshield";
  if (industry === "Finance") return "vaultbank";
  return "gridcore";
}

export function calculateVendorQuestionnaireAssessment(input: VendorQuestionnaireInput): VendorQuestionnaireResult {
  const entityKey = mapIndustryToEntityKey(input.industry);
  const baseEntityData = ENTITY_SCORING_DATA[entityKey];
  const baseEntityScore = calculateEntityScore(baseEntityData);

  const mfaPenalty = input.mfaEnabled ? 0 : 30;
  const adjustedScore = clamp(baseEntityScore.score - mfaPenalty, 0, 100);
  const mfaFinancialPenalty = input.mfaEnabled ? 0 : 500000;
  const baseImpact = calculateFinancialExposure(ENTITY_FINANCIAL_FACTORS[entityKey]);
  const potentialFinancialImpact = baseImpact + mfaFinancialPenalty;

  const costDrivers: string[] = [];
  if (!input.mfaEnabled) {
    costDrivers.push("MFA Control Gap: $500,000.00");
  }
  if (!input.encryptionEnabled) {
    costDrivers.push("Encryption Control Weakness: $250,000.00");
  }
  if (!input.incidentResponseReady) {
    costDrivers.push("Incident Response Readiness Gap: $150,000.00");
  }
  if (input.industry === "Healthcare") {
    costDrivers.push("HIPAA Non-Compliance Fine: $250,000.00");
  } else if (input.industry === "Energy") {
    costDrivers.push("NERC CIP Enforcement Penalty: $200,000.00");
  }

  return {
    entityKey,
    vendorName: input.vendorName,
    industry: input.industry,
    score: adjustedScore,
    grade: mapScoreToLetterGrade(adjustedScore),
    potentialFinancialImpact,
    mfaEnabled: input.mfaEnabled,
    syncStatus: "MANUAL_FORM",
    costDrivers: costDrivers.slice(0, 3),
  };
}
