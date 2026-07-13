import "server-only";

/**
 * Optional staging tenants hidden from fleet pickers until IRONFRAME_ENABLE_HIDDEN_STAGING_TENANTS=1.
 * Comma-separated slugs in IRONFRAME_HIDDEN_STAGING_TENANT_SLUGS (default: none).
 */
function hiddenStagingTenantSlugs(): Set<string> {
  if (process.env.IRONFRAME_ENABLE_HIDDEN_STAGING_TENANTS === "1") {
    return new Set();
  }
  const raw = process.env.IRONFRAME_HIDDEN_STAGING_TENANT_SLUGS?.trim() ?? "";
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((slug) => slug.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isHiddenStagingTenantSlug(slug: string | null | undefined): boolean {
  if (!slug?.trim()) return false;
  return hiddenStagingTenantSlugs().has(slug.trim().toLowerCase());
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
