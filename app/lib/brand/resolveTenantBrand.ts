import "server-only";

import prisma from "@/lib/prisma";
import { normalizeTenantSlugInput } from "@/app/lib/tenantSubdomain";
import { buildTenantBrand } from "@/app/lib/brand/formatTenantBrand";
import type { TenantBrand } from "@/app/lib/brand/tenantBrandTypes";

export async function resolveTenantBrand(slugRaw: string): Promise<TenantBrand | null> {
  const slug = normalizeTenantSlugInput(slugRaw);
  if (!slug) return null;

  const row = await prisma.tenant.findUnique({
    where: { slug },
    select: { slug: true, name: true, ale_baseline: true },
  });
  if (!row) return null;

  return buildTenantBrand(row.slug, row.name, row.ale_baseline);
}
