import type { TenantKey } from "@/app/utils/tenantIsolation";

const TENANT_SLUGS = new Set<TenantKey>(["medshield", "vaultbank", "gridcore", "defense"]);

export function normalizeCorporateTenantSlug(raw: string): TenantKey | null {
  const slug = raw.trim().toLowerCase();
  return TENANT_SLUGS.has(slug as TenantKey) ? (slug as TenantKey) : null;
}

export function readTenantSlugFromUserMetadata(
  metadata: Record<string, unknown> | null | undefined,
): TenantKey | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = metadata.tenant_slug;
  if (typeof raw !== "string") return null;
  return normalizeCorporateTenantSlug(raw);
}
