/**
 * Cyber insurance renewal incentive model (illustrative — for budget / underwriter narrative).
 * Discounts stack additively as basis points, capped at 100%.
 */

/** Default annual premium when tenant has not supplied one: $50,000.00 */
export const DEFAULT_ANNUAL_PREMIUM_CENTS = 5_000_000n;

export type InsuranceTenantData = {
  /** Annual premium in integer cents; defaults to {@link DEFAULT_ANNUAL_PREMIUM_CENTS}. */
  basePremium_cents?: bigint;
  /** Compliance framework label (SOC2, ISO27001, NIST, …). */
  framework: string;
  hasContinuousMonitoring: boolean;
  /** True when due diligence / post-mortem PDF artifacts exist on record. */
  hasDueDiligencePdfs: boolean;
};

export type InsuranceIncentiveResult = {
  basePremium_cents: bigint;
  /** Framework-only discount (basis points). */
  baseFrameworkDiscountBps: number;
  /** Ironwatch / continuous monitoring add-on (bps). */
  continuousMonitoringBps: number;
  /** Due diligence PDF forensics add-on (bps). */
  forensicsBps: number;
  /** Sum of the above, capped at 10_000. */
  totalDiscountBps: number;
  totalEstimatedSavings_cents: bigint;
};

/** ISO 15%, SOC2 / NIST 10% (NIST aligned to SOC2 tier per product default). */
export function insuranceBaseFrameworkDiscountBps(framework: string): number {
  const f = framework.toUpperCase().trim();
  if (f.includes("ISO")) return 1500;
  if (f.includes("SOC")) return 1000;
  if (f.includes("NIST")) return 1000;
  return 1000;
}

const CONTINUOUS_MONITORING_BPS = 1200;
const FORENSICS_BPS = 500;

export function calculateInsuranceIncentive(tenantData: InsuranceTenantData): InsuranceIncentiveResult {
  const basePremium_cents =
    tenantData.basePremium_cents != null && tenantData.basePremium_cents > 0n
      ? tenantData.basePremium_cents
      : DEFAULT_ANNUAL_PREMIUM_CENTS;

  const baseFrameworkDiscountBps = insuranceBaseFrameworkDiscountBps(tenantData.framework);
  const continuousMonitoringBps = tenantData.hasContinuousMonitoring ? CONTINUOUS_MONITORING_BPS : 0;
  const forensicsBps = tenantData.hasDueDiligencePdfs ? FORENSICS_BPS : 0;

  let totalDiscountBps = baseFrameworkDiscountBps + continuousMonitoringBps + forensicsBps;
  if (totalDiscountBps > 10_000) totalDiscountBps = 10_000;

  const totalEstimatedSavings_cents = (basePremium_cents * BigInt(totalDiscountBps)) / 10_000n;

  return {
    basePremium_cents,
    baseFrameworkDiscountBps,
    continuousMonitoringBps,
    forensicsBps,
    totalDiscountBps,
    totalEstimatedSavings_cents,
  };
}
