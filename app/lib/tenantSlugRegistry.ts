import "server-only";

import prisma from "@/lib/prisma";
import {
  APP_ROUTE_ROOTS,
  isReservedTenantSlugLabel,
  isValidTenantSlugLabel,
  normalizeTenantSlugInput,
} from "@/app/lib/tenantSubdomain";

export type TenantSlugRecord = {
  id: string;
  slug: string;
  name: string;
};

const CACHE_TTL_MS = 60_000;
const slugCache = new Map<string, { expiresAt: number; row: TenantSlugRecord | null }>();

function readCache(slug: string): TenantSlugRecord | null | undefined {
  const hit = slugCache.get(slug);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    slugCache.delete(slug);
    return undefined;
  }
  return hit.row;
}

function writeCache(slug: string, row: TenantSlugRecord | null): void {
  slugCache.set(slug, { expiresAt: Date.now() + CACHE_TTL_MS, row });
}

/** Normalize and validate a tenant slug for provisioning (DNS-safe subdomain label). */
export function normalizeProvisionedTenantSlug(raw: string): string | null {
  const slug = normalizeTenantSlugInput(raw);
  if (!slug || !isValidTenantSlugLabel(slug) || isReservedTenantSlugLabel(slug)) {
    return null;
  }
  if (APP_ROUTE_ROOTS.has(slug)) return null;
  return slug;
}

/** Resolve tenant row by slug — cached for middleware + RSC hot paths. */
export async function lookupTenantBySlug(slugRaw: string): Promise<TenantSlugRecord | null> {
  const slug = normalizeTenantSlugInput(slugRaw);
  if (!slug) return null;

  const cached = readCache(slug);
  if (cached !== undefined) return cached;

  const row = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true },
  });
  const record = row ? { id: row.id, slug: row.slug, name: row.name } : null;
  writeCache(slug, record);
  return record;
}

export function invalidateTenantSlugCache(slug?: string): void {
  if (slug) {
    slugCache.delete(normalizeTenantSlugInput(slug) ?? slug);
    return;
  }
  slugCache.clear();
}
