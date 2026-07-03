import {
  MASTER_VENDORS,
  getDaysUntilExpiration,
  type RiskTier,
  type VendorRecord,
} from "@/app/vendors/schema";
import { calculateVendorGrade, type VendorLetterGrade } from "@/utils/scoringEngine";

export type VendorSupplyChainNode = {
  vendorId: string;
  vendorName: string;
  industry: VendorRecord["industry"];
  associatedEntity: string;
  cascadedRiskTier: RiskTier;
  healthScore: {
    grade: VendorLetterGrade;
    score: number;
  };
  subProcessorCount: number;
  breachSubProcessors: string[];
};

export function slugVendorId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Elevate tier when N-tier subprocessors report active breach signals. */
export function resolveCascadedVendorRisk(vendor: VendorRecord): RiskTier {
  const breached = vendor.criticalSubProcessors.some((sp) => sp.status === "BREACH");
  if (breached) return "CRITICAL";
  return vendor.riskTier;
}

export function buildVendorSupplyChainNodes(
  vendors: readonly VendorRecord[] = MASTER_VENDORS,
): VendorSupplyChainNode[] {
  return vendors.map((vendor) => {
    const cascadedRiskTier = resolveCascadedVendorRisk(vendor);
    const breachSubProcessors = vendor.criticalSubProcessors
      .filter((sp) => sp.status === "BREACH")
      .map((sp) => sp.name);
    const daysUntilSoc2Expiration = getDaysUntilExpiration(vendor.documentExpirationDate);
    const healthScore = calculateVendorGrade({
      daysUntilSoc2Expiration,
      evidenceLockerDocs: ["SOC2", "INSURANCE"],
      hasActiveIndustryAlert: cascadedRiskTier === "CRITICAL",
      hasActiveBreachAlert: breachSubProcessors.length > 0,
      hasPendingVersioning: vendor.contractStatus.toUpperCase().includes("VIOLATION"),
      hasStakeholderEscalation: cascadedRiskTier === "HIGH",
      requiresManualReview: vendor.currentCadence === "OVERDUE",
    });

    return {
      vendorId: slugVendorId(vendor.vendorName),
      vendorName: vendor.vendorName,
      industry: vendor.industry,
      associatedEntity: vendor.associatedEntity,
      cascadedRiskTier,
      healthScore,
      subProcessorCount: vendor.criticalSubProcessors.length,
      breachSubProcessors,
    };
  });
}

export function countActiveThreatIntelVendors(nodes: VendorSupplyChainNode[]): number {
  return nodes.filter((node) => node.cascadedRiskTier !== "LOW").length;
}
