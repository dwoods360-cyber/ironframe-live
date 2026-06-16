import { normalizeTenantSlugInput, isValidTenantSlugLabel, isReservedTenantSlugLabel } from "@/app/lib/tenantSubdomain";

export function normalizeCorporateTenantSlug(raw: string): string | null {
  const slug = normalizeTenantSlugInput(raw);
  if (!slug || !isValidTenantSlugLabel(slug) || isReservedTenantSlugLabel(slug)) {
    return null;
  }
  return slug;
}

export function readTenantSlugFromUserMetadata(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = metadata.tenant_slug;
  if (typeof raw !== "string") return null;
  return normalizeCorporateTenantSlug(raw);
}
