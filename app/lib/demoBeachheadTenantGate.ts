/**
 * Demo beachhead seed tenants (medshield / vaultbank / gridcore).
 * On production they must not appear in the Command Center switcher unless the
 * operator has an explicit RBAC assignment (or is on that host subdomain).
 */

export const DEMO_BEACHHEAD_TENANT_SLUGS = ["medshield", "vaultbank", "gridcore"] as const;

export type DemoBeachheadTenantSlug = (typeof DEMO_BEACHHEAD_TENANT_SLUGS)[number];

/** True when production-style filtering should hide unassigned demo beachheads. */
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

/**
 * Hide demo beachhead rows on production unless:
 * - operator is explicitly assigned to that tenant id, or
 * - the request is host-bound to that tenant (subdomain workspace).
 */
export function filterDemoBeachheadTenants<T extends { slug: string; id?: string }>(
  rows: T[],
  assignedTenantIds: readonly string[] = [],
  options?: { hostTenantId?: string | null },
): T[] {
  if (!isProductionDemoBeachheadFilterActive()) return rows;

  const assigned = new Set(
    assignedTenantIds.map((id) => id.trim().toLowerCase()).filter(Boolean),
  );
  const hostId = options?.hostTenantId?.trim().toLowerCase() || "";

  return rows.filter((row) => {
    if (!isDemoBeachheadTenantSlug(row.slug)) return true;
    const rowId = row.id?.trim().toLowerCase() || "";
    if (rowId && assigned.has(rowId)) return true;
    if (hostId && rowId === hostId) return true;
    return false;
  });
}
