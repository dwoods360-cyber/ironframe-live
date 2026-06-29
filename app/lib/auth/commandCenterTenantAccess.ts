import "server-only";

import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import { filterHiddenStagingTenants, isHiddenStagingTenantSlug } from "@/app/lib/stagingTenantGate";
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
  /** GLOBAL_ADMIN may switch assigned workspaces even on tenant subdomains. */
  canSwitchTenantsOnSubdomain: boolean;
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
 * GLOBAL_ADMIN on apex lists every non-staging tenant; subdomain GLOBAL_ADMIN keeps assigned switch.
 */
export async function resolveCommandCenterTenantScope(): Promise<CommandCenterTenantScope> {
  const hostTenantUuid = await getHostBoundTenantUuid();
  const user = await getSupabaseSessionUser();
  const userId = user?.id?.trim() ?? "";
  if (!userId) {
    return {
      tenants: [],
      canAccessGlobal: false,
      hostTenantSlug: null,
      canSwitchTenantsOnSubdomain: false,
    };
  }

  const assignments = await prisma.userRoleAssignment.findMany({
    where: { userId },
    select: { tenantId: true, role: true },
  });

  if (assignments.length === 0) {
    return {
      tenants: [],
      canAccessGlobal: false,
      hostTenantSlug: null,
      canSwitchTenantsOnSubdomain: false,
    };
  }

  const hasGlobalAdmin = assignments.some((row) => row.role === UserRole.GLOBAL_ADMIN);
  const assignedTenantIds = [...new Set(assignments.map((row) => row.tenantId.trim()).filter(Boolean))];

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

  /** Subdomain host envelope — scoped operators stay locked; GLOBAL_ADMIN keeps assigned-tenant switch. */
  if (hostTenantUuid) {
    const allowed = assignments.some((row) => row.tenantId === hostTenantUuid);
    if (!allowed) {
      return {
        tenants: [],
        canAccessGlobal: false,
        hostTenantSlug: null,
        canSwitchTenantsOnSubdomain: false,
      };
    }
    const hostRow = await prisma.tenant.findUnique({
      where: { id: hostTenantUuid },
      select: tenantSelect,
    });
    if (!hostRow || isHiddenStagingTenantSlug(hostRow.slug)) {
      return {
        tenants: [],
        canAccessGlobal: false,
        hostTenantSlug: null,
        canSwitchTenantsOnSubdomain: false,
      };
    }

    const tenantIdsForSwitcher = hasGlobalAdmin ? assignedTenantIds : [hostTenantUuid];
    const rows = await prisma.tenant.findMany({
      ...tenantListQuery,
      where: { id: { in: tenantIdsForSwitcher } },
    });

    return {
      tenants: filterHiddenStagingTenants(mapTenantRows(rows)),
      canAccessGlobal: false,
      hostTenantSlug: hostRow.slug,
      canSwitchTenantsOnSubdomain: hasGlobalAdmin,
    };
  }

  const rows = await prisma.tenant.findMany(
    hasGlobalAdmin
      ? tenantListQuery
      : {
          ...tenantListQuery,
          where: { id: { in: assignedTenantIds } },
        },
  );

  return {
    tenants: filterHiddenStagingTenants(mapTenantRows(rows)),
    canAccessGlobal: hasGlobalAdmin,
    hostTenantSlug: null,
    canSwitchTenantsOnSubdomain: hasGlobalAdmin,
  };
}
