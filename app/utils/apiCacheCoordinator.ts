/**
 * TanStack Query / ad-hoc cache hooks — dispatch browser event so shells can reset tenant-derived payloads.
 * (No TanStack dependency today; event keeps cold-boot plumbing centralized.)
 */
export const TENANT_API_CACHE_INVALIDATE_EVENT = "ironframe:tenant-api-cache-invalidate";

export function invalidateTenantScopedApiCache(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TENANT_API_CACHE_INVALIDATE_EVENT));
}

/** Named cache facade for cold-boot / TAS wording (`cache.clear()`). */
export const tenantScopeCache = {
  clear(): void {
    invalidateTenantScopedApiCache();
  },
};
