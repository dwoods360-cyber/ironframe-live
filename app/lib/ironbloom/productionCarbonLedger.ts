import "server-only";

import prisma from "@/lib/prisma";
import { isElectricityMapsApiConfigured } from "@/app/services/ironbloom/rateEngine";
import { computeSustainabilityAle, fetchLiveCarbonIntensityForTenant } from "@/app/services/ironbloom/scoring";
import { TENANT_UUIDS, tenantKeyFromUuid } from "@/app/utils/tenantIsolation";

const SIMULATION_SOURCE_MARKERS = ["KIMBOT", "GRCBOT", "ATTBOT", "PHISHBOT", "INFILBOT", "CHAOS", "SIMULATION"];

/** Threat rows excluded from CSRD-labeled production exports. */
export function isSimulationThreatForCsrdExport(threat: {
  sourceAgent: string;
  ingestionDetails: string | null;
}): boolean {
  const src = threat.sourceAgent.trim().toUpperCase();
  if (SIMULATION_SOURCE_MARKERS.some((m) => src.includes(m))) return true;
  const raw = threat.ingestionDetails?.trim();
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.isChaosTest === true || parsed.isSimulation === true) return true;
    if (typeof parsed.chaosScenario === "string" && parsed.chaosScenario.trim()) return true;
  } catch {
    if (raw.includes('"isChaosTest":true') || raw.includes('"isSimulation":true')) return true;
  }
  return false;
}

/**
 * Production CSRD ledger: sum sealed `SustainabilityMetric.mitigated_value_cents` for non-simulation threats.
 */
export async function aggregateProductionMitigatedValueCents(
  tenantUuid: string,
  options?: { since?: Date },
): Promise<bigint> {
  const since = options?.since;
  const companies = await prisma.company.findMany({
    where: { tenantId: tenantUuid },
    select: { id: true },
  });
  if (!companies.length) return 0n;

  const threats = await prisma.threatEvent.findMany({
    where: { tenantCompanyId: { in: companies.map((c) => c.id) } },
    select: { id: true, sourceAgent: true, ingestionDetails: true },
    take: 2000,
  });

  const productionIds = threats
    .filter((t) => !isSimulationThreatForCsrdExport(t))
    .map((t) => t.id);
  if (!productionIds.length) return 0n;

  const agg = await prisma.sustainabilityMetric.aggregate({
    where: {
      threatId: { in: productionIds },
      mitigatedValueCents: { not: null },
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    _sum: { mitigatedValueCents: true },
  });
  return agg._sum.mitigatedValueCents ?? 0n;
}

/** Sum production `mitigated_value_cents` across all roster tenants since `options.since`. */
export async function aggregateMonthlyProductionMitigatedValueCents(options: {
  since: Date;
}): Promise<bigint> {
  let total = 0n;
  for (const tenantUuid of Object.values(TENANT_UUIDS)) {
    total += await aggregateProductionMitigatedValueCents(tenantUuid, { since: options.since });
  }
  return total;
}

export async function getProductionCarbonLedgerForTenant(tenantUuid: string | null): Promise<{
  mitigatedValueCents: string;
  tenantKey: ReturnType<typeof tenantKeyFromUuid>;
  forensicFallbackActive: boolean;
}> {
  return resolveDashboardMitigatedValueCents(tenantUuid);
}

/**
 * Dashboard / CFO path: production ledger cents, or forensic ALE projection when Electricity Maps is unprovisioned.
 */
export async function resolveDashboardMitigatedValueCents(tenantUuid: string | null): Promise<{
  mitigatedValueCents: string;
  tenantKey: ReturnType<typeof tenantKeyFromUuid>;
  forensicFallbackActive: boolean;
}> {
  if (!tenantUuid?.trim()) {
    return { mitigatedValueCents: "0", tenantKey: null, forensicFallbackActive: false };
  }
  const trimmed = tenantUuid.trim();
  const tenantKey = tenantKeyFromUuid(trimmed);
  const referenceKwh = Math.max(
    100,
    Number(process.env.IRONBLOOM_PULSE_REFERENCE_KWH ?? "500"),
  );

  let intensityIsForensic = !isElectricityMapsApiConfigured();
  if (tenantKey) {
    const quote = await fetchLiveCarbonIntensityForTenant(tenantKey);
    intensityIsForensic = quote.source === "FORENSIC_FALLBACK";
  }

  const ledgerCents = await aggregateProductionMitigatedValueCents(trimmed);

  if (tenantKey && (intensityIsForensic || ledgerCents === 0n)) {
    const ale = await computeSustainabilityAle({
      tenantKey,
      unitsKwh: referenceKwh,
      assetId: "CFO_EXPOSURE_MAP_FORENSIC",
    });
    return {
      mitigatedValueCents: ale.mitigatedValueCents.toString(),
      tenantKey,
      forensicFallbackActive: intensityIsForensic,
    };
  }

  return {
    mitigatedValueCents: ledgerCents.toString(),
    tenantKey,
    forensicFallbackActive: false,
  };
}
