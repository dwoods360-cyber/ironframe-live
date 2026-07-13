import "server-only";

import prisma from "@/lib/prisma";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import {
  canUsePerimeterWorkforce,
  requirePerimeterWorkforceOperator,
} from "@/app/lib/auth/perimeterWorkforceAccess";
import { isPlatformAdministratorIdentity } from "@/app/lib/auth/platformAdminAccess";

export type PartnerProvisionerScope =
  | { kind: "all" }
  | { kind: "assigned"; tenantIds: string[] };

export async function resolvePartnerProvisionerScope(
  userId: string,
  email?: string | null,
): Promise<PartnerProvisionerScope> {
  if (await isPlatformAdministratorIdentity(userId, email)) {
    return { kind: "all" };
  }

  const assignments = await prisma.userRoleAssignment.findMany({
    where: { userId: userId.trim() },
    select: { tenantId: true },
  });

  return {
    kind: "assigned",
    tenantIds: [...new Set(assignments.map((row) => row.tenantId))],
  };
}

/** GLOBAL_ADMIN or designated BUSINESS_ADMIN — may provision client workspaces. */
export async function canUsePartnerProvisioner(
  userId: string,
  email?: string | null,
): Promise<boolean> {
  return canUsePerimeterWorkforce(userId, email);
}

export async function canUsePartnerProvisionerFromSession(): Promise<boolean> {
  const user = await getSupabaseSessionUser();
  if (!user?.id?.trim()) return false;
  return canUsePartnerProvisioner(user.id, user.email);
}

export type PartnerProvisionerContext =
  | { userId: string; scope: PartnerProvisionerScope }
  | { error: string };

export async function requirePartnerProvisioner(): Promise<PartnerProvisionerContext> {
  const gate = await requirePerimeterWorkforceOperator();
  if ("error" in gate) {
    return {
      error:
        "GLOBAL_ADMIN or designated BUSINESS_ADMIN role required to manage client workspaces.",
    };
  }

  const user = await getSupabaseSessionUser();
  const scope = await resolvePartnerProvisionerScope(gate.userId, user?.email);
  return { userId: gate.userId, scope };
}

export async function assertTenantSlugInPartnerScope(
  context: { userId: string; scope: PartnerProvisionerScope },
  tenantSlug: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (context.scope.kind === "all") {
    return { ok: true };
  }

  const slug = tenantSlug.trim().toLowerCase();
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!tenant) {
    return { ok: false, error: `Tenant "${slug}" was not found.` };
  }

  if (!context.scope.tenantIds.includes(tenant.id)) {
    return { ok: false, error: "You do not have access to manage that client workspace." };
  }

  return { ok: true };
}
