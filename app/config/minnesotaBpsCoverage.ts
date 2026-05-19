import type { TenantKey } from "@/app/utils/tenantIsolation";

/** Minnesota BPS / Clean Buildings — modeled state benchmarking compliance horizon (Ironsight). */
export const MN_BPS_BENCHMARK_DEADLINE_ISO = "2026-06-01T00:00:00.000Z";

export const MN_BPS_COVERED_BUILDING_MIN_SQFT = 50_000;

/**
 * Portfolio square footage in Minnesota subject to BPS-style benchmarking for each dev tenant key.
 * Only keys with values strictly greater than {@link MN_BPS_COVERED_BUILDING_MIN_SQFT} generate CRITICAL drift.
 */
export const TENANT_MINNESOTA_BPS_ELIGIBLE_SQFT: Partial<Record<TenantKey, number>> = {
  medshield: 620_000,
  gridcore: 180_000,
  defense: 95_000,
};
