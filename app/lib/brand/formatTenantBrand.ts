import { formatCentsToUSD } from "@/app/utils/formatCentsToUSD";
import {
  DEFAULT_TENANT_ACCENT,
  SEED_TENANT_ACCENTS,
} from "@/app/lib/brand/seedTenantAccents";
import type { TenantBrand } from "@/app/lib/brand/tenantBrandTypes";

export function deriveTenantShortLabel(slug: string, displayName: string): string {
  const seed = SEED_TENANT_ACCENTS[slug]?.shortLabel;
  if (seed) return seed;
  const compact = slug.replace(/-/g, "").toUpperCase();
  if (compact) return compact;
  const first = displayName.trim().split(/\s+/)[0];
  return first ? first.toUpperCase() : "WORKSPACE";
}

export function buildTenantBrand(
  slug: string,
  displayName: string,
  aleBaselineCents: bigint | string | number,
): TenantBrand {
  const accent = SEED_TENANT_ACCENTS[slug] ?? DEFAULT_TENANT_ACCENT;
  return {
    slug,
    displayName: displayName.trim() || slug,
    shortLabel: deriveTenantShortLabel(slug, displayName),
    accentColor: accent.accentColor,
    accentClass: accent.accentClass,
    aleDisplay: formatCentsToUSD(aleBaselineCents),
  };
}
