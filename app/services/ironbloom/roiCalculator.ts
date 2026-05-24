import "server-only";

import { createHash } from "crypto";
import {
  MN_BPS_COVERED_BUILDING_MIN_SQFT,
  TENANT_MINNESOTA_BPS_ELIGIBLE_SQFT,
} from "@/app/config/minnesotaBpsCoverage";
import { readCarbonPulseState, pruneSamplesOlderThan24h } from "@/app/lib/ironbloom/carbonPulseState";
import { getLatestUtilityRateForTenant } from "@/app/services/ironbloom/rateEngine";
import {
  computeTotalSocietalValueCents,
  SOCIAL_COST_OF_CARBON_CENTS,
} from "@/app/services/ironbloom/tsvCalculator";
import { convertToCents } from "@/app/utils/ironbloomPhysicalToFinancial";
import { TENANT_UUIDS, type TenantKey } from "@/app/utils/tenantIsolation";

const TENANT_KEYS = Object.keys(TENANT_UUIDS) as TenantKey[];

/**
 * Modeled annual regulatory + advisory cost avoidance when automated benchmarking evidence
 * (Ironbloom sealed reports) satisfies Minnesota BPS / Clean Buildings-style filings — prorated to the reporting window.
 */
const MN_BPS_ANNUAL_MODELED_AVOIDANCE_CENTS = 1_200_000n;

export type CarbonRoiVmatsResult = {
  energySavingsCents: bigint;
  penaltyAvoidanceCents: bigint;
  totalMitigatedCents: bigint;
  avoidedCarbonMetricTons: number;
  /** Operational + regulatory value per metric ton CO₂e avoided (null when tons ~ 0). */
  carbonRoiCentsPerTon: bigint | null;
  blendedUtilityRateUsdPerKwh: number;
  gavel: {
    throttleEvidenceSha256: string | null;
    roiArtifactSha256: string;
    /** False when a throttle SHA-256 anchor is required but none exists in Carbon Pulse history. */
    evidenceBindingOk: boolean;
  };
  societalValueCents: bigint;
  sccComponentCents: bigint;
};

function aggregateMinnesotaPenaltyAvoidanceCents(reportingWindowDays: number): bigint {
  let total = 0n;
  const days = BigInt(Math.max(1, reportingWindowDays));
  for (const key of TENANT_KEYS) {
    const sq = TENANT_MINNESOTA_BPS_ELIGIBLE_SQFT[key];
    if (sq == null || sq <= MN_BPS_COVERED_BUILDING_MIN_SQFT) continue;
    total += (MN_BPS_ANNUAL_MODELED_AVOIDANCE_CENTS * days) / 365n;
  }
  return total;
}

async function latestThrottleEvidenceFromPulse(): Promise<string | null> {
  const state = await readCarbonPulseState();
  for (let i = state.dirtyGridAlerts.length - 1; i >= 0; i--) {
    const sha = state.dirtyGridAlerts[i]?.evidenceArtifactSha256;
    if (sha) return sha;
  }
  return null;
}

/**
 * Carbon ROI (VMAT): blended Gridcore utility savings + Minnesota BPS-modeled penalty avoidance vs avoided tonnes.
 * Gavel: ROI payload hashed with the latest Ironlock throttle evidence SHA-256 from Carbon Pulse (anti-greenwashing anchor).
 */
export async function calculateCarbonRoiVmats(input: {
  totalKwhSaved: bigint;
  averageIntensityGco2PerKwh: number | null;
  reportingWindowDays: number;
  /** When true, {@link CarbonRoiVmatsResult.gavel.evidenceBindingOk} requires a throttle artifact. */
  requireThrottleEvidence?: boolean;
}): Promise<CarbonRoiVmatsResult> {
  let sumRate = 0;
  let n = 0;
  for (const k of TENANT_KEYS) {
    const q = await getLatestUtilityRateForTenant(k);
    sumRate += q.rateUsdPerUnit;
    n += 1;
  }
  const blended = n > 0 ? sumRate / n : 0.118;

  const kwhNum = Number(input.totalKwhSaved);
  const energySavingsCents =
    Number.isFinite(kwhNum) && kwhNum > 0 && blended > 0
      ? convertToCents(kwhNum, "kWh", blended)
      : 0n;

  const penaltyAvoidanceCents = aggregateMinnesotaPenaltyAvoidanceCents(input.reportingWindowDays);
  const totalMitigatedCents = energySavingsCents + penaltyAvoidanceCents;

  const gco2 = input.averageIntensityGco2PerKwh ?? 380;
  const avoidedCarbonMetricTons =
    Number.isFinite(kwhNum) && kwhNum > 0 && Number.isFinite(gco2) && gco2 > 0
      ? (kwhNum * gco2) / 1_000_000
      : 0;

  const carbonRoiCentsPerTon =
    avoidedCarbonMetricTons > 1e-9
      ? BigInt(Math.max(0, Math.round(Number(totalMitigatedCents) / avoidedCarbonMetricTons)))
      : null;

  const throttleEvidenceSha256 = await latestThrottleEvidenceFromPulse();
  const tsv = computeTotalSocietalValueCents(avoidedCarbonMetricTons, totalMitigatedCents);
  const roiCanon = JSON.stringify({
    v: 1,
    vmats: "ironbloom.carbon_roi.tsv.v1",
    energySavingsCents: energySavingsCents.toString(),
    penaltyAvoidanceCents: penaltyAvoidanceCents.toString(),
    totalMitigatedCents: totalMitigatedCents.toString(),
    avoidedCarbonMetricTons,
    blendedUtilityRateUsdPerKwh: blended,
    socialCostOfCarbonCentsPerTon: SOCIAL_COST_OF_CARBON_CENTS.toString(),
    sccComponentCents: tsv.sccComponentCents.toString(),
    societalValueCents: tsv.societalValueCents.toString(),
    throttleEvidenceSha256,
  });
  const roiArtifactSha256 = createHash("sha256").update(roiCanon, "utf8").digest("hex");

  const requireEvidence = input.requireThrottleEvidence === true;
  const evidenceBindingOk = !requireEvidence || throttleEvidenceSha256 != null;

  return {
    energySavingsCents,
    penaltyAvoidanceCents,
    totalMitigatedCents,
    avoidedCarbonMetricTons,
    carbonRoiCentsPerTon,
    blendedUtilityRateUsdPerKwh: blended,
    gavel: {
      throttleEvidenceSha256,
      roiArtifactSha256,
      evidenceBindingOk,
    },
    societalValueCents: tsv.societalValueCents,
    sccComponentCents: tsv.sccComponentCents,
  };
}
