import "server-only";

import type { CarbonIntensityQuote } from "@/app/types/ironbloomScoring";
import { resolveTenantLocation, US_ZIP_GEO_ANCHORS } from "@/app/config/tenantUtilityLocation";
import {
  getCachedRateForTenant,
  IRONBLOOM_RATE_DRIFT_THRESHOLD,
  IRONBLOOM_RATE_POLL_INTERVAL_MS,
  isRatePollDue,
  readIronbloomRateState,
  writeIronbloomRateState,
} from "@/app/lib/ironbloomRateState";
import type {
  IronbloomRatePollResult,
  TenantLocation,
  UtilityRateQuote,
} from "@/app/types/ironbloomGridcore";
import { TENANT_UUIDS, type TenantKey as TenantSlug } from "@/app/utils/tenantIsolation";
import { notifyCfoEsgRebaseline } from "@/app/services/ironbloom/cfoRebaselineNotify";
import {
  buildRateSealDigest,
  computeRateDriftRatio,
  convertToCents,
} from "@/app/utils/ironbloomPhysicalToFinancial";

export { buildRateSealDigest, computeRateDriftRatio, convertToCents };

const OPENEI_BASE = "https://api.openei.org/utility_rates";
const NREL_UTILITY_RATES_V3 = "https://developer.nrel.gov/api/utility_rates/v3.json";
const GLOBAL_PETROL_BASE = "https://api.globalpetrolprices.com/v1/electricity/industrial";

/** Dev / offline fallback — industrial US grid ($/kWh). */
const DEV_FALLBACK_USD_PER_KWH = 0.118;
const PHYSICAL_UNIT_TYPES = new Set(["kWh", "L", "km"]);
const ZIP_OVERRIDE_PATTERN = /^\d{5}$/;

function normalizeCountry(country: string): string {
  const c = country.trim().toUpperCase();
  if (c === "US" || c === "UNITED STATES" || c === "UNITED STATES OF AMERICA") return "USA";
  return c;
}

function parseRateNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const n = Number.parseFloat(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function isPhysicalUnitType(value: string): value is UtilityRateQuote["unitType"] {
  return PHYSICAL_UNIT_TYPES.has(value);
}

function assertPhysicalMetricUnit(unitType: string, context: string): asserts unitType is UtilityRateQuote["unitType"] {
  if (!isPhysicalUnitType(unitType)) {
    throw new Error(`[IRONBLOOM_PHYSICAL_METRIC_REQUIRED] ${context}: invalid unitType "${unitType}".`);
  }
}

function validateUtilityQuote(quote: UtilityRateQuote, context: string): UtilityRateQuote {
  assertPhysicalMetricUnit(quote.unitType, context);
  if (!Number.isFinite(quote.rateUsdPerUnit) || quote.rateUsdPerUnit <= 0) {
    throw new Error(
      `[IRONBLOOM_PHYSICAL_METRIC_REQUIRED] ${context}: rateUsdPerUnit must be a positive finite number.`,
    );
  }
  return quote;
}

function sanitizeZipOverride(zipOverride: string | undefined): string | undefined {
  if (!zipOverride) return undefined;
  const normalized = zipOverride.trim();
  if (!normalized) return undefined;
  if (!ZIP_OVERRIDE_PATTERN.test(normalized)) {
    throw new Error(`[IRONBLOOM_INVALID_ZIP_OVERRIDE] zip override "${zipOverride}" must be a 5-digit ZIP.`);
  }
  return normalized;
}

async function fetchOpenEiUrdbZip(zipCode: string, apiKey: string): Promise<number | null> {
  const url = new URL(OPENEI_BASE);
  url.searchParams.set("version", "latest");
  url.searchParams.set("format", "json");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("zipcode", zipCode);
  url.searchParams.set("sector", "Industrial");
  url.searchParams.set("limit", "1");
  url.searchParams.set("detail", "minimal");

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) return null;
  const data = (await res.json()) as { items?: Array<Record<string, unknown>> };
  const item = data.items?.[0];
  if (!item) return null;

  const candidates = [
    item.industrial,
    item.industrial_rate,
    item.energyratestructure,
    item.fixedchargefirstmeter,
  ];
  for (const c of candidates) {
    const n = parseRateNumber(c);
    if (n != null) return n;
  }

  const label = String(item.label ?? item.name ?? "").toLowerCase();
  if (label.includes("industrial")) {
    const flat = parseRateNumber(item.energyratestructure);
    if (flat != null) return flat;
  }
  return null;
}

async function fetchNrelUtilityRatesV3(zipCode: string, apiKey: string): Promise<number | null> {
  const geo = US_ZIP_GEO_ANCHORS[zipCode];
  if (!geo) return null;
  const url = new URL(NREL_UTILITY_RATES_V3);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("lat", String(geo.lat));
  url.searchParams.set("lon", String(geo.lon));

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) return null;
  const data = (await res.json()) as { outputs?: { industrial?: number } };
  return parseRateNumber(data.outputs?.industrial);
}

async function fetchGlobalPetrolIndustrial(
  location: TenantLocation,
  apiKey: string,
): Promise<number | null> {
  const countryCode = (location.countryCode ?? location.country).trim().toUpperCase().slice(0, 2);
  const url = `${GLOBAL_PETROL_BASE}/${encodeURIComponent(countryCode)}`;
  const res = await fetch(url, {
    headers: { "X-Api-Key": apiKey, Accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Record<string, unknown>;
  const usd =
    parseRateNumber(data.price_usd) ??
    parseRateNumber(data.usd_per_kwh) ??
    parseRateNumber(data.industrial_usd_per_kwh) ??
    parseRateNumber(data.price);
  return usd;
}

/**
 * Geographic routing: USA → URDB zip lookup; international → country-level industrial rate.
 */
export async function fetchUtilityRateForLocation(location: TenantLocation): Promise<UtilityRateQuote> {
  const polledAt = new Date().toISOString();
  const country = normalizeCountry(location.country);
  const openEnergyKey = process.env.OPEN_ENERGY_API_KEY?.trim();
  const petrolKey = process.env.GLOBAL_PETROL_API_KEY?.trim();
  const liveSustainabilityMode = isElectricityMapsApiConfigured();

  if (country === "USA") {
    const zip = location.zipCode?.trim();
    if (!zip) {
      throw new Error("IRONBLOOM: USA utility lookup requires tenant.location.zipCode.");
    }
    let rateUsdPerUnit: number | null = null;
    let source: UtilityRateQuote["source"] = "openei-urdb";

    if (openEnergyKey) {
      rateUsdPerUnit = await fetchOpenEiUrdbZip(zip, openEnergyKey);
      if (rateUsdPerUnit == null) {
        rateUsdPerUnit = await fetchNrelUtilityRatesV3(zip, openEnergyKey);
        source = "nrel-utility-rates-v3";
      }
    }

    if (rateUsdPerUnit == null) {
      if (liveSustainabilityMode) {
        throw new Error(
          `[IRONBLOOM_LIVE_SOURCE_REQUIRED] No live utility rate returned for zip ${zip}. Configure OPEN_ENERGY_API_KEY and provider access.`,
        );
      }
      rateUsdPerUnit = DEV_FALLBACK_USD_PER_KWH;
      source = "forensic-estimate";
    }

    return validateUtilityQuote({
      rateUsdPerUnit,
      unitType: "kWh",
      source,
      jurisdiction: `USA:${zip}`,
      polledAt,
    }, `tenant utility quote (USA:${zip})`);
  }

  let rateUsdPerUnit: number | null = null;
  if (petrolKey) {
    rateUsdPerUnit = await fetchGlobalPetrolIndustrial(location, petrolKey);
  }
  if (rateUsdPerUnit == null) {
    if (liveSustainabilityMode) {
      throw new Error(
        `[IRONBLOOM_LIVE_SOURCE_REQUIRED] No live international utility rate returned for ${location.countryCode ?? location.country}. Configure GLOBAL_PETROL_API_KEY and provider access.`,
      );
    }
    rateUsdPerUnit = DEV_FALLBACK_USD_PER_KWH * 1.12;
  }

  return validateUtilityQuote({
    rateUsdPerUnit,
    unitType: "kWh",
    source: petrolKey ? "globalpetrol-industrial" : "forensic-estimate",
    jurisdiction: `INTL:${location.countryCode ?? location.country}`,
    polledAt,
  }, `tenant utility quote (INTL:${location.countryCode ?? location.country})`);
}

export async function fetchUtilityRateForTenant(tenantKey: TenantSlug): Promise<UtilityRateQuote> {
  return fetchUtilityRateForTenantWithOverrides(tenantKey);
}

export async function fetchUtilityRateForTenantWithOverrides(
  tenantKey: TenantSlug,
  options?: { zipOverride?: string },
): Promise<UtilityRateQuote> {
  const location = resolveTenantLocation(tenantKey);
  const zipOverride = sanitizeZipOverride(options?.zipOverride);
  const locationWithOverride: TenantLocation =
    zipOverride && normalizeCountry(location.country) === "USA"
      ? { ...location, zipCode: zipOverride }
      : location;
  return fetchUtilityRateForLocation(locationWithOverride);
}

const TENANT_KEYS = Object.keys(TENANT_UUIDS) as TenantSlug[];

/**
 * Gridcore integration poll — 30-day cadence; >15% drift triggers CFO ESG re-baseline alert.
 */
export async function runGridcoreUtilityRatePoll(options?: {
  force?: boolean;
  tenantKey?: TenantSlug;
  zipOverride?: string;
}): Promise<{ polledAt: string; results: IronbloomRatePollResult[]; skipped?: boolean }> {
  const state = await readIronbloomRateState();
  const now = Date.now();
  const zipOverride = sanitizeZipOverride(options?.zipOverride);
  const scopeTenantKeys = options?.tenantKey ? [options.tenantKey] : TENANT_KEYS;
  if (!options?.force && !isRatePollDue(state, now)) {
    return {
      polledAt: new Date(now).toISOString(),
      skipped: true,
      results: scopeTenantKeys.map((tenantKey) => ({
        tenantKey,
        skipped: true,
        reason: `Next poll in ${Math.ceil((IRONBLOOM_RATE_POLL_INTERVAL_MS - (now - Date.parse(state.lastGlobalPollAt ?? "0"))) / 86400000)} days`,
      })),
    };
  }

  const results: IronbloomRatePollResult[] = [];
  const nextRates = [...state.rates];
  const nextAlerts = [...state.alerts];

  for (const tenantKey of scopeTenantKeys) {
    const quote = await fetchUtilityRateForTenantWithOverrides(tenantKey, { zipOverride });
    validateUtilityQuote(quote, `utility poll result for ${tenantKey}`);
    const prior = getCachedRateForTenant(state, tenantKey);
    let driftDetected = false;
    let driftRatio = 0;
    let alertId: string | undefined;

    if (prior) {
      driftRatio = computeRateDriftRatio(prior.quote.rateUsdPerUnit, quote.rateUsdPerUnit);
      if (driftRatio > IRONBLOOM_RATE_DRIFT_THRESHOLD) {
        driftDetected = true;
        const notification = await notifyCfoEsgRebaseline({
          tenantKey,
          priorRateUsd: prior.quote.rateUsdPerUnit,
          newRateUsd: quote.rateUsdPerUnit,
          driftRatio,
          unitType: quote.unitType,
          jurisdiction: quote.jurisdiction,
        });
        alertId = notification.id;
        nextAlerts.push({
          id: notification.id,
          tenantKey,
          sentAt: notification.sentAt,
          previousRateUsd: prior.quote.rateUsdPerUnit,
          newRateUsd: quote.rateUsdPerUnit,
          driftRatio,
          unitType: quote.unitType,
          pulseMessage: notification.pulseMessage,
        });
      }
    }

    const idx = nextRates.findIndex((r) => r.tenantKey === tenantKey);
    const cached = { tenantKey, quote, lastPolledAt: quote.polledAt };
    if (idx >= 0) nextRates[idx] = cached;
    else nextRates.push(cached);

    results.push({ tenantKey, quote, driftDetected, driftRatio, alertId });
  }

  await writeIronbloomRateState({
    lastGlobalPollAt: new Date(now).toISOString(),
    rates: nextRates,
    alerts: nextAlerts.slice(-50),
  });

  return { polledAt: new Date(now).toISOString(), results };
}

export async function getLatestUtilityRateForTenant(
  tenantKey: TenantSlug,
): Promise<UtilityRateQuote> {
  const state = await readIronbloomRateState();
  const cached = getCachedRateForTenant(state, tenantKey);
  if (cached) return cached.quote;
  return fetchUtilityRateForTenant(tenantKey);
}

/** gCO₂eq/kWh (US-MN 2026 Baseline) — forensic path when Electricity Maps is absent or returns null. */
export const FALLBACK_CARBON_INTENSITY = 380;

/** Kimbot CSRD transparency label when grid intensity is estimated from the regional anchor. */
export const CSRD_TRANSPARENCY_ESTIMATED_REGIONAL_AVG = "[ESTIMATED: REGIONAL_AVG]";

const FORENSIC_JITTER_RATIO = 0.025;

export function isElectricityMapsApiConfigured(): boolean {
  return Boolean(process.env.ELECTRICITY_MAPS_API_KEY?.trim());
}

/**
 * ±2.5% forensic jitter on the US-MN anchor — dashboard telemetry stays alive without a live API key.
 */
export function jitterForensicCarbonIntensity(base = FALLBACK_CARBON_INTENSITY): number {
  const delta = (Math.random() * 2 - 1) * FORENSIC_JITTER_RATIO;
  const jittered = base * (1 + delta);
  return Math.round(jittered * 10) / 10;
}

export function buildForensicFallbackQuote(zone: string): CarbonIntensityQuote {
  return {
    zone,
    carbonIntensityGco2PerKwh: jitterForensicCarbonIntensity(),
    source: "FORENSIC_FALLBACK",
    transparencyLabel: CSRD_TRANSPARENCY_ESTIMATED_REGIONAL_AVG,
    polledAt: new Date().toISOString(),
  };
}
