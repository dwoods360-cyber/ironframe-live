"use server";

import { resolveTenantBrand } from "@/app/lib/brand/resolveTenantBrand";
import type { TenantBrand } from "@/app/lib/brand/tenantBrandTypes";

export async function resolveTenantBrandAction(
  slug: string,
): Promise<TenantBrand | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;
  return resolveTenantBrand(normalized);
}
