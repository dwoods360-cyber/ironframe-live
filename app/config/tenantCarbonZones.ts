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
  medshield: "US-NEIS",
  vaultbank: "US-NY",
  gridcore: "US-CO",
  defense: "US-MIDA-PJM",
};

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
