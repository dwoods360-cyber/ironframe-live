import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";

/**
 * Demo beachhead seed tenants (medshield / vaultbank / gridcore).
 * On production they never appear in the Command Center switcher on the apex
 * control plane — RBAC assignment alone is not enough (seed assigns platform
 * owners to these rows). Opt back in with IRONFRAME_SHOW_DEMO_BEACHHEAD_TENANTS=1,
 * or open the workspace host (`{slug}.ironframegrc.com`).
 */

export const DEMO_BEACHHEAD_TENANT_SLUGS = ["medshield", "vaultbank", "gridcore"] as const;

export type DemoBeachheadTenantSlug = (typeof DEMO_BEACHHEAD_TENANT_SLUGS)[number];

const DEMO_BEACHHEAD_TENANT_IDS = new Set(
  DEMO_BEACHHEAD_TENANT_SLUGS.map((slug) => TENANT_UUIDS[slug].toLowerCase()),
);

/** True when production-style filtering should hide demo beachheads from the switcher. */
export function isProductionDemoBeachheadFilterActive(): boolean {
  if (process.env.IRONFRAME_SHOW_DEMO_BEACHHEAD_TENANTS === "1") {
    return false;
  }
  if (process.env.IRONFRAME_FORCE_PRODUCTION_TENANT_FILTER === "1") {
    return true;
  }
  return process.env.VERCEL_ENV === "production";
}

export function isDemoBeachheadTenantSlug(slug: string | null | undefined): boolean {
  if (!slug?.trim()) return false;
  const normalized = slug.trim().toLowerCase();
  return (DEMO_BEACHHEAD_TENANT_SLUGS as readonly string[]).includes(normalized);
}

/** True when the id is a known demo beachhead UUID (medshield / vaultbank / gridcore). */
export function isDemoBeachheadTenantId(id: string | null | undefined): boolean {
  if (!id?.trim()) return false;
  return DEMO_BEACHHEAD_TENANT_IDS.has(id.trim().toLowerCase());
}

/**
 * Hide demo beachhead rows on production unless host-bound.
 * Prefer `filterNonLivePlatformTenants` for the full production switcher gate.
 */
export function filterDemoBeachheadTenants<T extends { slug: string; id?: string }>(
  rows: T[],
  _assignedTenantIds: readonly string[] = [],
  options?: { hostTenantId?: string | null },
): T[] {
  if (!isProductionDemoBeachheadFilterActive()) return rows;

  const hostId = options?.hostTenantId?.trim().toLowerCase() || "";

  return rows.filter((row) => {
    if (!isDemoBeachheadTenantSlug(row.slug)) return true;
    const rowId = row.id?.trim().toLowerCase() || "";
    if (hostId && rowId === hostId) return true;
    return false;
  });
}
