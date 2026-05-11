import { tenantIndustryCodeToProfileLabel } from "@/app/utils/tenantIndustryProfile";

/**
 * Benchmark / trend charts key off `MarketBenchmarkSnapshot.industry` cohort labels.
 * Maps DB codes (e.g. DEFENSE) and UI profile labels (e.g. Defense) to the snapshot row key.
 */
export function resolveTenantIndustryForBenchmarks(industry: string | null | undefined): string {
  const v = (industry ?? "").trim();
  if (!v) return "Healthcare";
  const upper = v.toUpperCase();
  if (
    upper === "DEFENSE" ||
    upper === "FEDERAL_GOVERNMENT" ||
    upper === "AEROSPACE" ||
    upper === "STATE_LOCAL" ||
    upper === "PUBLIC_SECTOR" ||
    upper === "HEALTHCARE" ||
    upper === "FINANCE" ||
    upper === "TECHNOLOGY" ||
    upper === "MANUFACTURING" ||
    upper === "RETAIL" ||
    upper === "INFRASTRUCTURE" ||
    upper === "ENERGY"
  ) {
    return tenantIndustryCodeToProfileLabel(v);
  }
  return v;
}
