import "server-only";

import type { SustainabilityMetric } from "@prisma/client";
import {
  sealIronbloomSustainabilityEvidence,
  type IronbloomEvidenceCanonical,
} from "@/app/services/ironbloom/ironbloomEvidenceLocker";
import {
  computeTotalSocietalValueCents,
  SOCIAL_COST_OF_CARBON_CENTS,
} from "@/app/services/ironbloom/tsvCalculator";

export type CarbonScoreLockPayload = Pick<
  SustainabilityMetric,
  | "threatId"
  | "kwhAverted"
  | "coolingWaterLiters"
  | "carbonOffsetGrams"
  | "mitigatedValueCents"
  | "totalSocietalValueCents"
> & {
  createdAt: Date;
  carbonIntensityGco2PerKwh: number;
  zone: string;
};

/**
 * Canonical SHA-256 evidence artifact for a sustainability metric (Ironbloom / Agent 18).
 * Links `EvidenceAttachment` to `threatId` (entity id `sustainability:{threatId}`).
 */
export async function lockCarbonScore(
  data: CarbonScoreLockPayload,
  tenantId: string,
): Promise<{ artifactId: string; sha256: string; canonical: string; storagePath: string }> {
  const recordedAt = data.createdAt.toISOString();
  const aleCents = (data.mitigatedValueCents ?? 0n).toString();
  const metricTonsCo2e = Number(data.carbonOffsetGrams) / 1_000_000;
  const { sccComponentCents, societalValueCents } = computeTotalSocietalValueCents(
    metricTonsCo2e,
    data.mitigatedValueCents ?? 0n,
  );

  const record: IronbloomEvidenceCanonical = {
    sealVersion: 1,
    tenantId,
    recordedAt,
    unitsKwh: Number(data.kwhAverted),
    carbonIntensityGco2PerKwh: data.carbonIntensityGco2PerKwh,
    aleCents,
    zone: data.zone,
    metricTonsCo2e,
    threatId: data.threatId,
    sccComponentCents: sccComponentCents.toString(),
    totalSocietalValueCents: societalValueCents.toString(),
    socialCostOfCarbonCentsPerTon: SOCIAL_COST_OF_CARBON_CENTS.toString(),
  };

  return sealIronbloomSustainabilityEvidence({
    tenantId,
    entityId: `sustainability:${data.threatId}`,
    record,
  });
}
