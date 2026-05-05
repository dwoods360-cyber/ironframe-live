import type { RiskEvent } from "@prisma/client";
import { computeMheHumanHours, parseLaborTracker } from "@/app/utils/sentinelLaborTracker";
import type { IncidentReportPayload } from "@/app/utils/incidentReportData";

/**
 * GRC Gap (dashboard): peer industry-mean ALE minus current mitigated / observed exposure.
 * Pure BigInt subtraction in **integer cents** — no framework multipliers (NIST/ISO/SOC), no asset counts,
 * and no double-application of regulatory uplift (those apply only in `computeBudgetCore` / budget justification).
 *
 * @returns `max(0n, industryAverageCents - currentMitigatedCents)` so the HUD does not show a negative gap
 * when exposure is already below the sector baseline.
 */
export function calculateGrcGapCents(
  industryAverageCents: bigint,
  currentMitigatedCents: bigint,
): bigint {
  const delta = industryAverageCents - currentMitigatedCents;
  return delta > 0n ? delta : 0n;
}

/** Sectors where zero GRC gap triggers a broker-confidence compliance premium (higher scrutiny). */
const BROKER_CONFIDENCE_PREMIUM_SECTORS = new Set(["Defense", "Federal Government"]);

/**
 * Broker Confidence uplift: Defense and Federal tenants with **$0 GRC Gap** receive a +15% compliance premium
 * on the base score (multiplicative, capped at 100%).
 */
export function applyBrokerConfidenceCompliancePremium(
  baseConfidencePct: number,
  selectedIndustry: string,
  grcGapCentsDecimalString: string,
): number {
  if (!BROKER_CONFIDENCE_PREMIUM_SECTORS.has(selectedIndustry)) {
    return baseConfidencePct;
  }
  let gap = 0n;
  try {
    gap = BigInt(grcGapCentsDecimalString.trim() || "0");
  } catch {
    return baseConfidencePct;
  }
  if (gap !== 0n) return baseConfidencePct;
  return Math.min(100, Math.round(baseConfidencePct * 1.15 * 100) / 100);
}

/** Assumed fully burdened forensic analyst rate for budget narrative (USD/hr). */
export const FORENSIC_ANALYST_HOURLY_RATE_USD = 150;

/** Framework multipliers as integer hundredths (1.2 → 120) — aligns with regulatory exposure model. */
export function frameworkMultiplierBps(framework: string): bigint {
  const f = framework.toUpperCase().trim();
  if (f.includes("ISO")) return 150n;
  if (f.includes("NIST") || f.includes("GDPR")) return 400n;
  if (f.includes("SOC")) return 120n;
  return 120n;
}

export type BudgetJustificationResult = {
  aleCents: bigint;
  /** Integer hundredths (e.g. 120 = 1.2×). */
  frameworkMultiplierBps: bigint;
  /** ALE + (ALE × multiplier) in cents (BigInt-safe). */
  potentialLossCents: bigint;
  /** Pure regulatory uplift portion: (ALE × multiplier) cents. */
  regulatoryUpliftCents: bigint;
  /** MHE × $150/hr in cents. */
  humanLaborCostCents: bigint;
  mheHumanHours: number;
  /** max(0, potentialLossCents - humanLaborCostCents). */
  totalValueCreatedCents: bigint;
};

function computeBudgetCore(
  aleCents: bigint,
  framework: string,
  mheHumanHours: number,
): BudgetJustificationResult {
  const mult100 = frameworkMultiplierBps(framework);
  const regulatoryUpliftCents = (aleCents * mult100) / 100n;
  const potentialLossCents = aleCents + regulatoryUpliftCents;
  const laborUsd = Math.max(0, mheHumanHours) * FORENSIC_ANALYST_HOURLY_RATE_USD;
  const humanLaborCostCents = BigInt(Math.round(laborUsd * 100));
  let totalValueCreatedCents = potentialLossCents - humanLaborCostCents;
  if (totalValueCreatedCents < 0n) totalValueCreatedCents = 0n;
  return {
    aleCents,
    frameworkMultiplierBps: mult100,
    potentialLossCents,
    regulatoryUpliftCents,
    humanLaborCostCents,
    mheHumanHours,
    totalValueCreatedCents,
  };
}

/**
 * Budget justification from a persisted `RiskEvent` (MHE from `ingestionDetails.laborTracker`).
 */
export function calculateBudgetJustification(
  event: Pick<RiskEvent, "financialRisk_cents" | "complianceFramework" | "ingestionDetails">,
): BudgetJustificationResult {
  const aleCents = event.financialRisk_cents ?? 0n;
  const ingestion =
    event.ingestionDetails && typeof event.ingestionDetails === "object" && !Array.isArray(event.ingestionDetails)
      ? (event.ingestionDetails as Record<string, unknown>)
      : {};
  const laborParsed = parseLaborTracker(ingestion.laborTracker);
  const mheHumanHours =
    laborParsed.mheHumanHours ?? Math.round(computeMheHumanHours(laborParsed.byAgent) * 100) / 100;
  return computeBudgetCore(aleCents, String(event.complianceFramework ?? "SOC2"), mheHumanHours);
}

/** Same math for PDF generation from an `IncidentReportPayload` (no DB round-trip). */
export function calculateBudgetJustificationFromIncidentPayload(
  payload: IncidentReportPayload,
): BudgetJustificationResult {
  let aleCents = 0n;
  try {
    aleCents = BigInt(payload.financialRiskCents ?? "0");
  } catch {
    aleCents = 0n;
  }
  const mhe = payload.operationalResourceUtilization?.mheHumanHours ?? 0;
  return computeBudgetCore(aleCents, payload.complianceFramework ?? "SOC2", mhe);
}
