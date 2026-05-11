"use server";

import prisma from "@/lib/prisma";

export type CommandCenterTenantRow = {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  aleBaselineCents: string;
};

/**
 * All tenants for Global Command Center dropdown — name/slug/industry from DB (cross-industry testing).
 */
export async function listCommandCenterTenants(): Promise<CommandCenterTenantRow[]> {
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
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    industry: t.industry,
    aleBaselineCents: t.ale_baseline.toString(),
  }));
}
