import type { TenantLocation } from "@/app/types/ironbloomGridcore";
import { tenantKeyFromUuid, type TenantKey } from "@/app/utils/tenantIsolation";

/**
 * Gridcore / Ironbloom geographic routing — `tenant.location` contract keyed by tenant slug.
 * Production may later hydrate from DB; routing logic reads this resolver only.
 */
export const TENANT_UTILITY_LOCATIONS: Record<TenantKey, TenantLocation> = {
  medshield: { country: "USA", zipCode: "02115", countryCode: "US" },
  vaultbank: { country: "USA", zipCode: "10004", countryCode: "US" },
  gridcore: { country: "USA", zipCode: "75201", countryCode: "US" },
  defense: { country: "USA", zipCode: "20001", countryCode: "US" },
};

/** NREL utility_rates v3 lat/lon anchors when OpenEI zip lookup is unavailable. */
export const US_ZIP_GEO_ANCHORS: Record<string, { lat: number; lon: number }> = {
  "02115": { lat: 42.34, lon: -71.09 },
  "10004": { lat: 40.7, lon: -74.01 },
  "75201": { lat: 32.79, lon: -96.8 },
  "80202": { lat: 39.75, lon: -104.99 },
  "20001": { lat: 38.91, lon: -77.01 },
};

export function resolveTenantLocation(tenantKey: TenantKey): TenantLocation {
  return TENANT_UTILITY_LOCATIONS[tenantKey];
}

/** Utility geography for analyst export — seed slugs map directly; provisioned tenants use US corporate default. */
export function resolveTenantLocationForExport(exportKey: string): TenantLocation {
  const normalized = exportKey.trim().toLowerCase();
  if (normalized in TENANT_UTILITY_LOCATIONS) {
    return TENANT_UTILITY_LOCATIONS[normalized as TenantKey];
  }
  return TENANT_UTILITY_LOCATIONS.medshield;
}

export function resolveTenantLocationByUuid(tenantUuid: string | null): TenantLocation | null {
  const key = tenantKeyFromUuid(tenantUuid);
  if (!key) return null;
  return resolveTenantLocation(key);
}
