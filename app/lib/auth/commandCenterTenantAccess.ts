import "server-only";

import { Prisma, UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { isPlatformGlobalAdminEmail } from "@/config/platformSecurity";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import { filterNonLivePlatformTenants } from "@/app/lib/productionTenantSwitcherGate";
import { filterHiddenStagingTenants, isHiddenStagingTenantSlug } from "@/app/lib/stagingTenantGate";
import { getHostBoundTenantUuid } from "@/app/utils/serverTenantContext";

function finalizeSwitcherTenants<
  T extends {
    slug: string;
    id?: string;
    name?: string | null;
    parentTenantId?: string | null;
    enclaveRole?: string | null;
  },
>(rows: T[], assignedTenantIds: readonly string[], hostTenantId?: string | null): T[] {
  return filterNonLivePlatformTenants(
    filterHiddenStagingTenants(rows, assignedTenantIds),
    assignedTenantIds,
    { hostTenantId },
  );
}

export type CommandCenterTenantRow = {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  aleBaselineCents: string;
  parentTenantId: string | null;
  enclaveRole: string;
};

export type CommandCenterTenantScope = {
  tenants: CommandCenterTenantRow[];
  /** Aggregate "Global Command Center" lane — GLOBAL_ADMIN only (never on tenant subdomain). */
  canAccessGlobal: boolean;
  /** Tenant slug when host is subdomain-bound (switcher locked). */
  hostTenantSlug: string | null;
  /** Operators with multiple assignments (or GLOBAL_ADMIN) may switch workspaces on tenant subdomains. */
  canSwitchTenantsOnSubdomain: boolean;
};

type TenantBaseRow = {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  ale_baseline: bigint;
};

/**
 * Enclave hierarchy columns via SQL so a stale Prisma Client (missing DMMF fields)
 * cannot break the Command Center switcher after migrate deploy.
 */
async function loadEnclaveFieldsByTenantId(
  ids: string[],
): Promise<Map<string, { parentTenantId: string | null; enclaveRole: string }>> {
  const out = new Map<string, { parentTenantId: string | null; enclaveRole: string }>();
  if (ids.length === 0) return out;
  const rows = await prisma.$queryRaw<
    Array<{ id: string; parent_tenant_id: string | null; enclave_role: string | null }>
  >`
    SELECT id::text AS id,
           parent_tenant_id::text AS parent_tenant_id,
           enclave_role
    FROM tenants
    WHERE id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})
  `;
  for (const row of rows) {
    out.set(row.id, {
      parentTenantId: row.parent_tenant_id,
      enclaveRole: (row.enclave_role ?? "PRIMARY").trim() || "PRIMARY",
    });
  }
  return out;
}

async function mapTenantRows(rows: TenantBaseRow[]): Promise<CommandCenterTenantRow[]> {
  const enclaveById = await loadEnclaveFieldsByTenantId(rows.map((r) => r.id));
  return rows.map((t) => {
    const enclave = enclaveById.get(t.id);
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      industry: t.industry,
      aleBaselineCents: t.ale_baseline.toString(),
      parentTenantId: enclave?.parentTenantId ?? null,
      enclaveRole: enclave?.enclaveRole ?? "PRIMARY",
    };
  });
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
    select: { tenantId: true, role: true, grantedAt: true },
    orderBy: [{ grantedAt: "desc" }, { tenantId: "asc" }],
  });

  const isPlatformOwner = isPlatformGlobalAdminEmail(user?.email);

  if (assignments.length === 0 && !isPlatformOwner) {
    return {
      tenants: [],
      canAccessGlobal: false,
      hostTenantSlug: null,
      canSwitchTenantsOnSubdomain: false,
    };
  }

  const hasGlobalAdmin =
    isPlatformOwner || assignments.some((row) => row.role === UserRole.GLOBAL_ADMIN);
  const assignedTenantIds = [
    ...new Map(
      assignments
        .map((row) => row.tenantId.trim())
        .filter(Boolean)
        .map((tenantId) => [tenantId, tenantId] as const),
    ).keys(),
  ];

  /** Base columns only — enclave fields loaded via SQL (see mapTenantRows). */
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

  const hasMultiAssignment = assignedTenantIds.length > 1;
  const canSwitchAssignedWorkspaces =
    hasMultiAssignment || (hasGlobalAdmin && assignedTenantIds.length > 0);

  /** Subdomain host envelope — single-assignment operators stay locked; multi-assignment can hop subdomains. */
  if (hostTenantUuid) {
    const allowed =
      isPlatformOwner || assignments.some((row) => row.tenantId === hostTenantUuid);
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
    const hostIsStagingHidden =
      Boolean(hostRow) &&
      isHiddenStagingTenantSlug(hostRow?.slug ?? "") &&
      !assignedTenantIds.includes(hostTenantUuid);
    if (!hostRow || hostIsStagingHidden) {
      return {
        tenants: [],
        canAccessGlobal: false,
        hostTenantSlug: null,
        canSwitchTenantsOnSubdomain: false,
      };
    }

    const tenantIdsForSwitcher = canSwitchAssignedWorkspaces ? assignedTenantIds : [hostTenantUuid];
    const rows = await prisma.tenant.findMany({
      ...tenantListQuery,
      where: { id: { in: tenantIdsForSwitcher } },
    });

    return {
      tenants: finalizeSwitcherTenants(
        await mapTenantRows(rows),
        assignedTenantIds,
        hostTenantUuid,
      ),
      canAccessGlobal: false,
      hostTenantSlug: hostRow.slug,
      canSwitchTenantsOnSubdomain: canSwitchAssignedWorkspaces,
    };
  }

  if (hasGlobalAdmin) {
    const rows = await prisma.tenant.findMany(tenantListQuery);
    return {
      tenants: finalizeSwitcherTenants(await mapTenantRows(rows), assignedTenantIds),
      canAccessGlobal: true,
      hostTenantSlug: null,
      canSwitchTenantsOnSubdomain: canSwitchAssignedWorkspaces,
    };
  }

  const rows = await prisma.tenant.findMany({
    ...tenantListQuery,
    where: { id: { in: assignedTenantIds } },
  });

  const tenantOrder = new Map(assignedTenantIds.map((tenantId, index) => [tenantId, index]));
  const orderedRows = [...rows].sort(
    (left, right) => (tenantOrder.get(left.id) ?? 0) - (tenantOrder.get(right.id) ?? 0),
  );

  return {
    tenants: finalizeSwitcherTenants(await mapTenantRows(orderedRows), assignedTenantIds),
    canAccessGlobal: false,
    hostTenantSlug: null,
    canSwitchTenantsOnSubdomain: canSwitchAssignedWorkspaces,
  };
}
