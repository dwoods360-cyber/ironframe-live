import type { TenantKey } from "@/app/utils/tenantIsolation";

/** Default absolute cap for dirty grid + autonomous throttling (gCO₂eq/kWh). Override via env `TENANT_CARBON_THRESHOLD`. */
export const DEFAULT_TENANT_CARBON_THRESHOLD_GCO2 = 400;

/** Optional per-tenant intensity caps (gCO₂eq/kWh). When unset, env or default applies. */
export const TENANT_CARBON_INTENSITY_THRESHOLD_GCO2: Partial<Record<TenantKey, number>> = {
  defense: 380,
};

export function getTenantCarbonIntensityThresholdGco2(tenantKey: TenantKey): number {
  const mapped = TENANT_CARBON_INTENSITY_THRESHOLD_GCO2[tenantKey];
  if (typeof mapped === "number" && mapped > 0) return mapped;
  const env = Number(process.env.TENANT_CARBON_THRESHOLD?.trim());
  if (Number.isFinite(env) && env > 0) return env;
  return DEFAULT_TENANT_CARBON_THRESHOLD_GCO2;
}

/** Electricity Maps zone keys for live carbon intensity (gCO₂/kWh). */
export const TENANT_ELECTRICITY_MAP_ZONES: Record<TenantKey, string> = {
  medshield: "US-NE-ISNE",
  vaultbank: "US-NY",
  gridcore: "US-CO",
  defense: "US-MIDA-PJM",
};

/**
 * Rogue client hints during fast tenant context switches (e.g. stale Gridcore geo codes).
 * Maps to canonical roster zones when tenant key is not yet bound on the server.
 */
export const ELECTRICITY_MAP_ZONE_ALIASES: Record<string, string> = {
  "US-GD": "US-CO",
  /** Legacy typo — Electricity Maps canonical key is US-NE-ISNE (ISO New England). */
  "US-NEIS": "US-NE-ISNE",
};

/**
 * Tenant-anchored grid intensity (gCO₂/kWh) when Electricity Maps is unreachable.
 * Derived from utility geography (`tenantUtilityLocation`) + regional grid profiles — not a global constant.
 */
export const TENANT_DEFAULT_CARBON_INTENSITY_GCO2: Record<TenantKey, number> = {
  medshield: 392,
  vaultbank: 318,
  gridcore: 445,
  defense: 412,
};

export function getDefaultCarbonIntensityGco2ForTenant(tenantKey: TenantKey): number {
  return TENANT_DEFAULT_CARBON_INTENSITY_GCO2[tenantKey];
}

export function tenantKeyFromElectricityMapZone(zone: string): TenantKey | null {
  const z = zone.trim();
  for (const [key, mapped] of Object.entries(TENANT_ELECTRICITY_MAP_ZONES) as [TenantKey, string][]) {
    if (mapped === z) return key;
  }
  return null;
}

/**
 * During tenant context switches, client hints (e.g. US-GD) may not match roster zones.
 * Prefer the tenant's canonical Electricity Maps zone when the hint is unknown.
 */
export function resolveElectricityMapsZoneForTenant(
  tenantKey: TenantKey,
  zoneHint?: string | null,
): string {
  const rosterZone = TENANT_ELECTRICITY_MAP_ZONES[tenantKey];
  const hint = zoneHint?.trim();
  if (!hint) return rosterZone;
  if (Object.values(TENANT_ELECTRICITY_MAP_ZONES).includes(hint)) return hint;
  if (tenantKeyFromElectricityMapZone(hint)) return hint;
  const alias = ELECTRICITY_MAP_ZONE_ALIASES[hint];
  if (alias) return alias;
  return rosterZone;
}

/**
 * Normalize any zone hint to a canonical Electricity Maps roster zone.
 * Prefer tenant roster when `tenantKey` is known; otherwise apply global aliases.
 */
export function normalizeElectricityMapsZone(
  zoneHint?: string | null,
  tenantKey?: TenantKey | null,
): string {
  if (tenantKey) {
    return resolveElectricityMapsZoneForTenant(tenantKey, zoneHint);
  }
  const hint = zoneHint?.trim();
  if (!hint) return TENANT_ELECTRICITY_MAP_ZONES.medshield;
  if (Object.values(TENANT_ELECTRICITY_MAP_ZONES).includes(hint)) return hint;
  if (tenantKeyFromElectricityMapZone(hint)) return hint;
  const alias = ELECTRICITY_MAP_ZONE_ALIASES[hint];
  if (alias) return alias;
  return hint;
}

/** Localized carbon penalty likelihood × impact (R_tax) as basis points (11500 = 1.15×). */
export const TENANT_REGULATORY_CARBON_MULTIPLIER_BPS: Record<TenantKey, bigint> = {
  medshield: 11500n,
  vaultbank: 12500n,
  gridcore: 11000n,
  defense: 13500n,
};

/** @deprecated Use TENANT_REGULATORY_CARBON_MULTIPLIER_BPS */
export const TENANT_REGULATORY_CARBON_MULTIPLIER: Record<TenantKey, number> = {
  medshield: 1.15,
  vaultbank: 1.25,
  gridcore: 1.1,
  defense: 1.35,
};
