"use server";

import { readGridcoreCarbonLedgerState } from "@/app/lib/ironbloom/gridcoreCarbonLedgerState";
import { resolveDashboardMitigatedValueCents } from "@/app/lib/ironbloom/productionCarbonLedger";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

export type CarbonLedgerRowDto = {
  id: string;
  zone: string;
  recordedAt: string;
  energyConsumedKwh: string;
  carbonIntensityGrams: string;
  source: string;
  renewablePercentage: number | null;
};

export type SustainabilityAnalyticsPlaneData = {
  ledgerRows: CarbonLedgerRowDto[];
  lastSynchronizedAt: string | null;
  referenceKwhLabel: string;
  productionMitigatedValueCents: string;
  forensicFallbackActive: boolean;
};

/**
 * Epic 9 / 5 — Ironbloom grid coefficients + tenant production ledger snapshot for the analytics plane.
 */
export async function getSustainabilityAnalyticsPlaneData(): Promise<SustainabilityAnalyticsPlaneData> {
  const tenantUuid = await getActiveTenantUuidFromCookies();
  const referenceKwh = Math.max(
    100,
    Number(process.env.IRONBLOOM_PULSE_REFERENCE_KWH ?? "500") | 0,
  );
  const referenceKwhLabel = `${referenceKwh} kWh (reference scope per zone)`;

  const [ledgerState, production] = await Promise.all([
    readGridcoreCarbonLedgerState(),
    resolveDashboardMitigatedValueCents(tenantUuid),
  ]);

  const ledgerRows: CarbonLedgerRowDto[] = ledgerState.coefficients.map((c, index) => ({
    id: c.telemetryFingerprint || `ledger-${index}`,
    zone: c.zone,
    recordedAt: c.polledAt,
    energyConsumedKwh: String(referenceKwh),
    carbonIntensityGrams: c.carbonIntensityGrams,
    source: c.source,
    renewablePercentage: c.renewablePercentage,
  }));

  return {
    ledgerRows,
    lastSynchronizedAt: ledgerState.lastSynchronizedAt,
    referenceKwhLabel,
    productionMitigatedValueCents: production.mitigatedValueCents,
    forensicFallbackActive: production.forensicFallbackActive,
  };
}
