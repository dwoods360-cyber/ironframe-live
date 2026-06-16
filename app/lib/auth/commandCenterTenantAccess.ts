import "server-only";

import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import { getHostBoundTenantUuid } from "@/app/utils/serverTenantContext";

export type CommandCenterTenantRow = {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  aleBaselineCents: string;
};

export type CommandCenterTenantScope = {
  tenants: CommandCenterTenantRow[];
  /** Aggregate "Global Command Center" lane — GLOBAL_ADMIN only (never on tenant subdomain). */
  canAccessGlobal: boolean;
  /** Tenant slug when host is subdomain-bound (switcher locked). */
  hostTenantSlug: string | null;
};

function mapTenantRows(
  rows: Array<{
    id: string;
    name: string;
    slug: string;
    industry: string | null;
    ale_baseline: bigint;
  }>,
): CommandCenterTenantRow[] {
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    industry: t.industry,
    aleBaselineCents: t.ale_baseline.toString(),
  }));
}

/**
 * Tenants visible in the Command Center switcher — scoped to RBAC assignments.
 * GLOBAL_ADMIN may list every tenant and use the aggregate global lane.
 */
export async function resolveCommandCenterTenantScope(): Promise<CommandCenterTenantScope> {
  const hostTenantUuid = await getHostBoundTenantUuid();
  const user = await getSupabaseSessionUser();
  const userId = user?.id?.trim() ?? "";
  if (!userId) {
    return { tenants: [], canAccessGlobal: false, hostTenantSlug: null };
  }

  const assignments = await prisma.userRoleAssignment.findMany({
    where: { userId },
    select: { tenantId: true, role: true },
  });

  if (assignments.length === 0) {
    return { tenants: [], canAccessGlobal: false, hostTenantSlug: null };
  }

  const tenantSelect = {
    id: true,
    name: true,
    slug: true,
    industry: true,
    ale_baseline: true,
  } as const;

  const tenantListQuery = {
    select: tenantSelect,
    orderBy: { name: "asc" as const },
  };

  /** Subdomain host envelope — single tenant workspace; no global lane or cross-tenant switch. */
  if (hostTenantUuid) {
    const allowed = assignments.some((row) => row.tenantId === hostTenantUuid);
    if (!allowed) {
      return { tenants: [], canAccessGlobal: false, hostTenantSlug: null };
    }
    const row = await prisma.tenant.findUnique({
      where: { id: hostTenantUuid },
      select: tenantSelect,
    });
    if (!row) {
      return { tenants: [], canAccessGlobal: false, hostTenantSlug: null };
    }
    return {
      tenants: mapTenantRows([row]),
      canAccessGlobal: false,
      hostTenantSlug: row.slug,
    };
  }

  const hasGlobalAdmin = assignments.some((row) => row.role === UserRole.GLOBAL_ADMIN);
  const assignedTenantIds = [...new Set(assignments.map((row) => row.tenantId.trim()).filter(Boolean))];

  if (hasGlobalAdmin) {
    const rows = await prisma.tenant.findMany(tenantListQuery);
    return { tenants: mapTenantRows(rows), canAccessGlobal: true, hostTenantSlug: null };
  }

  const rows = await prisma.tenant.findMany({
    ...tenantListQuery,
    where: { id: { in: assignedTenantIds } },
  });

  return { tenants: mapTenantRows(rows), canAccessGlobal: false, hostTenantSlug: null };
}
