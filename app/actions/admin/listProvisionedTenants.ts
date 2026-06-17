"use server";

import prisma from "@/lib/prisma";
import { requirePlatformAdministrator } from "@/app/lib/auth/platformAdminAccess";
import { buildTenantSubdomainOrigin } from "@/app/lib/tenantSubdomain";

export type ProvisionedTenantAdminRow = {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  aleBaselineCents: string;
  workspaceUrl: string;
  billingStatus: string | null;
};

export async function listProvisionedTenantsForAdminAction(): Promise<
  { ok: true; tenants: ProvisionedTenantAdminRow[] } | { ok: false; error: string }
> {
  const admin = await requirePlatformAdministrator();
  if ("error" in admin) {
    return { ok: false, error: admin.error };
  }

  const port = Number(process.env.PORT?.trim() || "3000") || 3000;
  const rows = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      industry: true,
      ale_baseline: true,
    },
    orderBy: { name: "asc" },
  });

  const billingRows = await prisma.tenantBilling.findMany({
    where: { tenantSlug: { in: rows.map((r) => r.slug) } },
    select: { tenantSlug: true, status: true },
  });
  const billingBySlug = new Map(billingRows.map((b) => [b.tenantSlug, b.status]));

  return {
    ok: true,
    tenants: rows.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      industry: t.industry,
      aleBaselineCents: t.ale_baseline.toString(),
      workspaceUrl: buildTenantSubdomainOrigin(t.slug, port),
      billingStatus: billingBySlug.get(t.slug) ?? null,
    })),
  };
}
