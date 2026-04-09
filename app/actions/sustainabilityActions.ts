"use server";

import prisma from "@/lib/prisma";
import { ThreatState } from "@prisma/client";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

/**
 * Legacy Ironbloom aggregation path (Epic 5-era).
 * Sprint 9.1 introduces `IronbloomEsgMetric` + `/api/esg/ingest` physical-unit bouncer.
 * Keep this path for backward compatibility until Sprint 9.2 migration completes.
 */

async function getCompanyIdForActiveTenant(): Promise<bigint | null> {
  const tenantUuid = await getActiveTenantUuidFromCookies();
  const company = await prisma.company.findFirst({
    where: { tenantId: tenantUuid },
    select: { id: true },
  });
  return company?.id ?? null;
}

/** Serialized totals + human-readable strings for dashboard (JSON-safe numbers only — no BigInt). */
export type GlobalSustainabilityImpact = {
  totalKwh: number;
  totalWaterLiters: number;
  totalCarbonGrams: number;
  /** totalCarbonGrams / 1000 */
  totalCarbonKg: number;
  recordCount: number;
  energyDisplay: string;
  waterDisplay: string;
  carbonDisplay: string;
  /** Compact lines for header / CSRD-style chip */
  chipLineCarbon: string;
  chipLineEnergy: string;
  /** Executive / CSRD: "CO2 Offset: [X] kg" */
  co2OffsetKgChip: string;
  /** Exact copy per Sprint 5.2 spec */
  energySavedLine: string;
  waterAvertedLine: string;
  totalOffsetKgCo2eLine: string;
};

/** BigInt → number for RSC/client props (JSON cannot serialize BigInt). */
function bigintToNumber(value: bigint | null | undefined): number {
  if (value == null) return 0;
  return Number(value);
}

function formatEnergyKwh(totalKwh: number): string {
  if (!Number.isFinite(totalKwh) || totalKwh <= 0) return "0 kWh";
  if (totalKwh >= 1000) {
    const mwh = totalKwh / 1000;
    return `${mwh >= 10 ? mwh.toFixed(1) : mwh.toFixed(2)} MWh`;
  }
  return `${Math.round(totalKwh).toLocaleString()} kWh`;
}

function formatWaterLiters(L: number): string {
  if (!Number.isFinite(L) || L <= 0) return "0 L";
  if (L >= 1_000_000) return `${(L / 1_000_000).toFixed(2)} ML`;
  if (L >= 1000) return `${(L / 1000).toFixed(2)} kL`;
  return `${L.toLocaleString(undefined, { maximumFractionDigits: 1 })} L`;
}

/** Grams → kg display; metric tons when large (≥ 1 000 000 g). */
function formatCarbonGrams(grams: number): { short: string; chip: string } {
  if (!Number.isFinite(grams) || grams <= 0) {
    return { short: "0 kg CO₂e", chip: "Total Carbon Offset: 0 kg CO₂e" };
  }
  if (grams >= 1_000_000) {
    const t = grams / 1_000_000;
    const s = t >= 10 ? t.toFixed(1) : t.toFixed(2);
    return {
      short: `${s} t CO₂e`,
      chip: `Total Carbon Offset: ${s} t CO₂e`,
    };
  }
  const kg = grams / 1000;
  const s = kg >= 100 ? kg.toFixed(0) : kg.toFixed(1);
  return {
    short: `${s} kg CO₂e`,
    chip: `Total Carbon Offset: ${s} kg CO₂e`,
  };
}

/**
 * Tenant-scoped aggregates from `SustainabilityMetric` (threats tied to active tenant company).
 */
export async function getGlobalSustainabilityImpact(): Promise<GlobalSustainabilityImpact> {
  const companyId = await getCompanyIdForActiveTenant();
  if (companyId == null) {
    return emptyGlobalSustainabilityImpact();
  }

  const whereTenant = { threat: { tenantCompanyId: companyId } };
  /** Sum in application code so Prisma `_sum` BigInt + aggregate edge cases never leak into JSON. */
  const rows = await prisma.sustainabilityMetric.findMany({
    where: whereTenant,
    select: {
      kwhAverted: true,
      coolingWaterLiters: true,
      carbonOffsetGrams: true,
    },
  });

  let sumKwh = 0n;
  let sumCarbon = 0n;
  let totalWaterLiters = 0;
  for (const r of rows) {
    sumKwh += r.kwhAverted;
    sumCarbon += r.carbonOffsetGrams;
    totalWaterLiters += r.coolingWaterLiters;
  }

  const totalKwh = bigintToNumber(sumKwh);
  const totalCarbonGrams = bigintToNumber(sumCarbon);
  const recordCount = rows.length;

  const energyDisplay = formatEnergyKwh(totalKwh);
  const waterDisplay = formatWaterLiters(totalWaterLiters);
  const carbonFmt = formatCarbonGrams(totalCarbonGrams);
  const totalCarbonKg = totalCarbonGrams / 1000;
  const kgDisplay = formatKgPlain(totalCarbonKg);

  return {
    totalKwh,
    totalWaterLiters,
    totalCarbonGrams,
    totalCarbonKg,
    recordCount,
    energyDisplay,
    waterDisplay,
    carbonDisplay: carbonFmt.short,
    chipLineCarbon: carbonFmt.chip,
    chipLineEnergy: `Energy Saved: ${energyDisplay}`,
    co2OffsetKgChip: `CO2 Offset: ${kgDisplay} kg`,
    energySavedLine: `Energy Saved: ${Math.round(totalKwh).toLocaleString()} kWh`,
    waterAvertedLine: `Water Averted: ${formatLitersPlain(totalWaterLiters)} L`,
    totalOffsetKgCo2eLine: `Total Offset: ${kgDisplay} kg CO2e`,
  };
}

function formatKgPlain(kg: number): string {
  if (!Number.isFinite(kg) || kg <= 0) return "0";
  if (kg >= 100) return kg.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return kg.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatLitersPlain(L: number): string {
  if (!Number.isFinite(L) || L <= 0) return "0";
  return L.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function emptyGlobalSustainabilityImpact(): GlobalSustainabilityImpact {
  return {
    totalKwh: 0,
    totalWaterLiters: 0,
    totalCarbonGrams: 0,
    totalCarbonKg: 0,
    recordCount: 0,
    energyDisplay: "0 kWh",
    waterDisplay: "0 L",
    carbonDisplay: "0 kg CO₂e",
    chipLineCarbon: "Total Carbon Offset: 0 kg CO₂e",
    chipLineEnergy: "Energy Saved: 0 kWh",
    co2OffsetKgChip: "CO2 Offset: 0 kg",
    energySavedLine: "Energy Saved: 0 kWh",
    waterAvertedLine: "Water Averted: 0 L",
    totalOffsetKgCo2eLine: "Total Offset: 0 kg CO2e",
  };
}

/** High tier: 1–10 severity 8–10, or 0–100 scale ≥80. */
function isHighSeverity(score: number): boolean {
  if (score >= 8 && score <= 10) return true;
  if (score > 10 && score >= 80) return true;
  return false;
}

/**
 * Records Ironbloom sustainability impact when a threat is mitigated (RESOLVED).
 * Idempotent per threat via upsert on `threatId`.
 */
export async function recordSustainabilityImpact(
  threatId: string,
): Promise<
  | { ok: true; recorded: true }
  | { ok: true; recorded: false; reason: "not_found" | "not_resolved" }
  | { ok: false; error: string }
> {
  try {
    const threat = await prisma.threatEvent.findUnique({
      where: { id: threatId },
      select: { id: true, score: true, status: true },
    });
    if (!threat) {
      return { ok: true, recorded: false, reason: "not_found" };
    }
    if (threat.status !== ThreatState.RESOLVED) {
      return { ok: true, recorded: false, reason: "not_resolved" };
    }

    const high = isHighSeverity(threat.score);
    const kwhAverted = high ? 2500n : 500n;
    const carbonOffsetGrams = high ? 1500n : 300n; // 1.5 kg vs 0.3 kg CO2e
    const coolingWaterLiters = Number(kwhAverted) * 1.8;

    await prisma.sustainabilityMetric.upsert({
      where: { threatId },
      create: {
        threatId,
        kwhAverted,
        coolingWaterLiters,
        carbonOffsetGrams,
      },
      update: {
        kwhAverted,
        coolingWaterLiters,
        carbonOffsetGrams,
      },
    });

    return { ok: true, recorded: true };
  } catch (e) {
    console.error("[sustainabilityActions] recordSustainabilityImpact:", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
