import type { IngressPayload } from './ingressClient.js';

/** Platform air-gap pool for unauthenticated / channel prospects (matches prisma seed + agent perimeter tests). */
export const PROSPECT_POOL_TENANT_SLUG = 'prospect-pool';

/** Beachhead vertical demos — maps OSINT sector to seeded industrial tenant CRM vaults. */
export const IRONLEADS_SECTOR_TENANT_SLUGS: Record<IngressPayload['industrySector'], string> = {
  REGIONAL_BHC: 'vaultbank',
  UTILITY_NERC: 'gridcore',
  HEALTH_HIPAA: 'medshield',
  MSSP_ENCLAVE: PROSPECT_POOL_TENANT_SLUG,
};

/**
 * Resolve Irongate ingress tenant slug for a qualified lead.
 * Sector map wins; otherwise falls back to IRONLEADS_TARGET_TENANT_SLUG (default prospect pool).
 */
export function resolveTargetTenantSlugForSector(
  industrySector: string,
  fallbackSlug: string = PROSPECT_POOL_TENANT_SLUG,
): string {
  const key = industrySector.trim() as IngressPayload['industrySector'];
  const mapped = IRONLEADS_SECTOR_TENANT_SLUGS[key];
  if (mapped) return mapped;
  const fallback = fallbackSlug.trim();
  return fallback.length >= 2 ? fallback : PROSPECT_POOL_TENANT_SLUG;
}
