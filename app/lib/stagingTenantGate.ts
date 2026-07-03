import "server-only";

/** Path A onboarding tenants hidden until IRONFRAME_ENABLE_BWC_STAGING=1. */
const HIDDEN_STAGING_TENANT_SLUGS = new Set(["bwc"]);

export function isHiddenStagingTenantSlug(slug: string | null | undefined): boolean {
  if (!slug?.trim()) return false;
  if (process.env.IRONFRAME_ENABLE_BWC_STAGING === "1") return false;
  return HIDDEN_STAGING_TENANT_SLUGS.has(slug.trim().toLowerCase());
}

export function filterHiddenStagingTenants<T extends { slug: string; id?: string }>(
  rows: T[],
  assignedTenantIds: readonly string[] = [],
): T[] {
  const assigned = new Set(assignedTenantIds.map((id) => id.trim().toLowerCase()).filter(Boolean));
  return rows.filter((row) => {
    const rowId = row.id?.trim().toLowerCase();
    if (rowId && assigned.has(rowId)) return true;
    return !isHiddenStagingTenantSlug(row.slug);
  });
}
