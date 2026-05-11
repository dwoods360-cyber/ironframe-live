/**
 * Governance impact multiplier in basis points (100 = 1.00×, 160 = 1.60×).
 * Must stay aligned with `prisma/seedIndustrialBaselines.ts` `governanceMultiplierBps`.
 */
const TENANT_INDUSTRY_CODE_TO_GOVERNANCE_BPS: Record<string, number> = {
  DEFENSE: 160,
  FEDERAL_GOVERNMENT: 140,
  AEROSPACE: 150,
  STATE_LOCAL: 110,
  PUBLIC_SECTOR: 120,
  HEALTHCARE: 100,
  FINANCE: 100,
  TECHNOLOGY: 130,
  MANUFACTURING: 100,
  RETAIL: 100,
  INFRASTRUCTURE: 100,
  ENERGY: 100,
};

/** Resolve bps from `Tenant.industry` DB code; defaults to 100 (1.00×) when unknown. */
export function governanceMultiplierBpsFromTenantIndustryCode(
  industryCode: string | null | undefined,
): number {
  const code = (industryCode ?? "").trim().toUpperCase();
  if (!code) return 100;
  return TENANT_INDUSTRY_CODE_TO_GOVERNANCE_BPS[code] ?? 100;
}
