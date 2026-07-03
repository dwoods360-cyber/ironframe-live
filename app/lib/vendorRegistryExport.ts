import {
  MASTER_VENDORS,
  getDaysUntilExpiration,
  type RiskTier,
  type VendorRecord,
} from "@/app/vendors/schema";
import { calculateVendorGrade } from "@/utils/scoringEngine";

export type VendorRegistrySummary = {
  totalVendors: number;
  byRiskTier: Record<RiskTier, number>;
  overdueRenewals: number;
  quarantineReady: number;
  activeThreatIntel: number;
  exportedAtIso: string;
};

export type VendorRegistryExportRow = {
  vendorName: string;
  associatedEntity: string;
  industry: string;
  riskTier: string;
  securityRating: string;
  contractStatus: string;
  daysUntilExpiration: number;
  healthGrade: string;
  healthScore: number;
};

function resolveEffectiveRiskTier(vendor: VendorRecord): RiskTier {
  if (vendor.vendorName.includes("Azure Health")) return "CRITICAL";
  const breached = vendor.criticalSubProcessors.some((sp) => sp.status === "BREACH");
  if (breached) return "CRITICAL";
  return vendor.riskTier;
}

export function buildVendorRegistryExportRows(
  vendors: readonly VendorRecord[] = MASTER_VENDORS,
): VendorRegistryExportRow[] {
  return vendors.map((vendor) => {
    const daysUntilExpiration = getDaysUntilExpiration(vendor.documentExpirationDate);
    const riskTier = resolveEffectiveRiskTier(vendor);
    const healthScore = calculateVendorGrade({
      daysUntilSoc2Expiration: daysUntilExpiration,
      evidenceLockerDocs: ["SOC2", "INSURANCE"],
      hasActiveIndustryAlert: false,
      hasActiveBreachAlert: vendor.vendorName === "Schneider Electric",
      hasPendingVersioning: false,
      hasStakeholderEscalation: false,
      requiresManualReview: false,
    });

    return {
      vendorName: vendor.vendorName,
      associatedEntity: vendor.associatedEntity,
      industry: vendor.industry,
      riskTier,
      securityRating: vendor.securityRating,
      contractStatus: vendor.contractStatus,
      daysUntilExpiration,
      healthGrade: healthScore.grade,
      healthScore: healthScore.score,
    };
  });
}

export function buildVendorRegistrySummary(
  vendors: readonly VendorRecord[] = MASTER_VENDORS,
): VendorRegistrySummary {
  const rows = buildVendorRegistryExportRows(vendors);
  const byRiskTier: Record<RiskTier, number> = { CRITICAL: 0, HIGH: 0, LOW: 0 };

  let overdueRenewals = 0;
  let quarantineReady = 0;
  let activeThreatIntel = 0;

  for (const row of rows) {
    const tier = row.riskTier as RiskTier;
    if (tier in byRiskTier) {
      byRiskTier[tier] += 1;
    }
    if (row.daysUntilExpiration <= 0) overdueRenewals += 1;
    if (row.healthGrade === "D" || row.healthGrade === "F") quarantineReady += 1;
    if (row.riskTier === "CRITICAL") activeThreatIntel += 1;
  }

  return {
    totalVendors: rows.length,
    byRiskTier,
    overdueRenewals,
    quarantineReady,
    activeThreatIntel,
    exportedAtIso: new Date().toISOString(),
  };
}

function escapeCsvCell(value: string | number): string {
  const raw = String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function buildVendorRegistryCsv(rows: readonly VendorRegistryExportRow[]): string {
  const headers = [
    "vendorName",
    "associatedEntity",
    "industry",
    "riskTier",
    "securityRating",
    "contractStatus",
    "daysUntilExpiration",
    "healthGrade",
    "healthScore",
  ] as const;

  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((key) => escapeCsvCell(row[key])).join(","),
    ),
  ];

  return lines.join("\n");
}

export function downloadVendorRegistryCsv(filenamePrefix = "ironframe-vendor-registry"): void {
  if (typeof window === "undefined") return;

  // Callers must gate via usePilotStubExportGate — this export always compiles MASTER_VENDORS seed rows.
  const rows = buildVendorRegistryExportRows();
  const csv = buildVendorRegistryCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `${filenamePrefix}-${stamp}.csv`;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export type VendorDownloadDetail = {
  format?: "csv" | "both";
};
