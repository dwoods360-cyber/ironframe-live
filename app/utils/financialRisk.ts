import { TENANT_INDUSTRY_BASELINE_ALE_CENTS } from "@/app/constants/devTenantRoster";
import { formatCentsToAccountingUSD, formatCentsToUSD } from "@/app/utils/formatCentsToUSD";
import type { TenantKey } from "@/app/utils/tenantIsolation";

/** Statutory liability ratio applied to total governance assets (3%). */
export const GOVERNANCE_LIABILITY_RATIO = 0.03;

/** Maximum maturity-driven discount on probabilistic liability (95% at score 10). */
export const GOVERNANCE_MATURITY_DISCOUNT_CAP = 0.95;

/** TAS §3 / Agent 11 governance exposure envelope (billions USD). */
export const GOVERNANCE_EXPOSURE_ENVELOPE_BILLIONS = 1.6;

export type GovernanceBaselineMode = "tenant_ale" | "governance_envelope";

export type CostOfNonComplianceResult = {
  maturityScore: number;
  baselineMode: GovernanceBaselineMode;
  totalBaselineUsd: number;
  totalBaselineCents: string;
  liabilityRatio: number;
  maturityDiscountFactor: number;
  maxExposureUsd: number;
  probabilisticLiabilityUsd: number;
  governanceDividendUsd: number;
  probabilisticLiabilityDisplay: string;
  governanceDividendDisplay: string;
  maxExposureDisplay: string;
  totalBaselineDisplay: string;
  /** Sustainability ALE (Ironbloom) included in executive CoNC view. */
  sustainabilityAleCents: string;
  sustainabilityAleDisplay: string;
  /** Penalty avoided by responding to Ironlock Dirty Grid alerts (CFO line). */
  carbonPenaltyAvoidedCents: string;
  carbonPenaltyAvoidedDisplay: string;
  combinedGovernanceDividendDisplay: string;
  /** CFO gavel: incremental governance dividend erosion if +0.5 self-healing maturity bonus were lost (manual vs automated scrutiny). */
  resilienceBonusDividendAtRiskDisplay?: string;
  resilienceGavelNarrative?: string;
};

function clampMaturityForCoNC(score: number): number {
  if (!Number.isFinite(score)) return 1;
  return Math.min(10, Math.max(1, score));
}

function parseBaselineCents(raw: bigint | string | number | null | undefined): bigint | null {
  if (raw == null) return null;
  try {
    if (typeof raw === "bigint") return raw > 0n ? raw : null;
    const s = String(raw).trim().replace(/,/g, "");
    if (!s) return null;
    const n = BigInt(s);
    return n > 0n ? n : null;
  } catch {
    return null;
  }
}

/**
 * Resolves Total_Baseline (USD) for CoNC.
 * — `tenant_ale`: constitutional industry ALE (dynamic per tenant / override cents).
 * — `governance_envelope`: 1.6B exposure envelope (Defense chaos / TAS §3).
 */
export function resolveGovernanceTotalAssetsUsd(params: {
  tenantKey?: TenantKey | null;
  baselineCents?: bigint | string | number | null;
  baselineMode?: GovernanceBaselineMode;
}): { totalBaselineUsd: number; totalBaselineCents: string; baselineMode: GovernanceBaselineMode } {
  const mode = params.baselineMode ?? "tenant_ale";

  if (mode === "governance_envelope") {
    const usd = GOVERNANCE_EXPOSURE_ENVELOPE_BILLIONS * 1_000_000_000;
    return {
      totalBaselineUsd: usd,
      totalBaselineCents: String(Math.round(usd * 100)),
      baselineMode: "governance_envelope",
    };
  }

  const override = parseBaselineCents(params.baselineCents);
  if (override != null) {
    return {
      totalBaselineUsd: Number(override) / 100,
      totalBaselineCents: override.toString(),
      baselineMode: "tenant_ale",
    };
  }

  if (params.tenantKey && TENANT_INDUSTRY_BASELINE_ALE_CENTS[params.tenantKey]) {
    const cents = TENANT_INDUSTRY_BASELINE_ALE_CENTS[params.tenantKey];
    return {
      totalBaselineUsd: Number(cents) / 100,
      totalBaselineCents: cents.toString(),
      baselineMode: "tenant_ale",
    };
  }

  const usd = GOVERNANCE_EXPOSURE_ENVELOPE_BILLIONS * 1_000_000_000;
  return {
    totalBaselineUsd: usd,
    totalBaselineCents: String(Math.round(usd * 100)),
    baselineMode: "governance_envelope",
  };
}

export function resolveGovernanceBaselineMode(tenantKey: TenantKey | null | undefined): GovernanceBaselineMode {
  return tenantKey === "defense" ? "governance_envelope" : "tenant_ale";
}

/**
 * Cost of Non-Compliance (CoNC):
 * Potential_Liability = (Total_Baseline × 0.03) × (1 − (Maturity_Score − 1) / 9 × 0.95)
 * Governance_Dividend = maxExposure − probabilisticLiability
 */
export function computeCostOfNonCompliance(
  maturityScore: number,
  params?: {
    tenantKey?: TenantKey | null;
    baselineCents?: bigint | string | number | null;
    baselineMode?: GovernanceBaselineMode;
    sustainabilityAleCents?: bigint | string | number | null;
    carbonPenaltyAvoidedCents?: bigint | string | number | null;
    /** When true, attach CFO “gavel” lines for incremental governance dividend at risk if the +0.5 bonus were lost. */
    selfHealingResilienceBonusActive?: boolean;
  },
): CostOfNonComplianceResult {
  const score = clampMaturityForCoNC(maturityScore);
  const mode =
    params?.baselineMode ??
    resolveGovernanceBaselineMode(params?.tenantKey ?? null);

  const baseline = resolveGovernanceTotalAssetsUsd({
    tenantKey: params?.tenantKey,
    baselineCents: params?.baselineCents,
    baselineMode: mode,
  });

  const maturityDiscountFactor = ((score - 1) / 9) * GOVERNANCE_MATURITY_DISCOUNT_CAP;
  const maxExposureUsd = baseline.totalBaselineUsd * GOVERNANCE_LIABILITY_RATIO;
  const probabilisticLiabilityUsd = maxExposureUsd * (1 - maturityDiscountFactor);
  const governanceDividendUsd = maxExposureUsd - probabilisticLiabilityUsd;

  const toCents = (usd: number) => BigInt(Math.max(0, Math.round(usd * 100)));
  const sustainabilityAle = parseBaselineCents(params?.sustainabilityAleCents) ?? 0n;
  const carbonAvoided = parseBaselineCents(params?.carbonPenaltyAvoidedCents) ?? 0n;
  const combinedDividendCents =
    toCents(governanceDividendUsd) + sustainabilityAle + carbonAvoided;

  const result: CostOfNonComplianceResult = {
    maturityScore: score,
    baselineMode: baseline.baselineMode,
    totalBaselineUsd: baseline.totalBaselineUsd,
    totalBaselineCents: baseline.totalBaselineCents,
    liabilityRatio: GOVERNANCE_LIABILITY_RATIO,
    maturityDiscountFactor,
    maxExposureUsd,
    probabilisticLiabilityUsd,
    governanceDividendUsd,
    probabilisticLiabilityDisplay: formatCentsToAccountingUSD(toCents(probabilisticLiabilityUsd)),
    governanceDividendDisplay: formatCentsToAccountingUSD(toCents(governanceDividendUsd)),
    maxExposureDisplay: formatCentsToAccountingUSD(toCents(maxExposureUsd)),
    totalBaselineDisplay: formatCentsToAccountingUSD(BigInt(baseline.totalBaselineCents)),
    sustainabilityAleCents: sustainabilityAle.toString(),
    sustainabilityAleDisplay: formatCentsToAccountingUSD(sustainabilityAle),
    carbonPenaltyAvoidedCents: carbonAvoided.toString(),
    carbonPenaltyAvoidedDisplay: formatCentsToAccountingUSD(carbonAvoided),
    combinedGovernanceDividendDisplay: formatCentsToAccountingUSD(combinedDividendCents),
  };

  if (params?.selfHealingResilienceBonusActive === true && score > 1) {
    const shadowScore = Math.max(1, score - 0.5);
    const shadow = computeCostOfNonCompliance(shadowScore, {
      ...params,
      selfHealingResilienceBonusActive: false,
    });
    const govDeltaCents = toCents(result.governanceDividendUsd - shadow.governanceDividendUsd);
    if (govDeltaCents > 0n) {
      result.resilienceBonusDividendAtRiskDisplay = formatCentsToAccountingUSD(govDeltaCents);
      result.resilienceGavelNarrative =
        "Regulators increasingly expect demonstrable automated environmental controls. Losing the self-healing " +
        "continuity bonus (−0.5 maturity) widens probabilistic liability and compresses the governance dividend " +
        `(≈${result.resilienceBonusDividendAtRiskDisplay} core dividend at risk at this baseline).`;
    }
  }

  return result;
}

/** Compact executive label (badge / post-mortem headers). */
export function formatCoNCExecutiveUsd(usd: number): string {
  return formatCentsToUSD(BigInt(Math.max(0, Math.round(usd * 100))));
}

export function buildFinancialDefenseNarrative(
  conc: CostOfNonComplianceResult,
  scenario: string,
): string {
  const envelope =
    conc.baselineMode === "governance_envelope"
      ? `$${GOVERNANCE_EXPOSURE_ENVELOPE_BILLIONS}B governance envelope`
      : `${conc.totalBaselineDisplay} constitutional ALE baseline`;
  return (
    `During ${scenario}, maturity ${conc.maturityScore.toFixed(1)}/10 on ${envelope} ` +
    `preserved ${conc.governanceDividendDisplay} governance dividend ` +
    `(probabilistic liability ${conc.probabilisticLiabilityDisplay} of ${conc.maxExposureDisplay} max exposure at 3%).`
  );
}
