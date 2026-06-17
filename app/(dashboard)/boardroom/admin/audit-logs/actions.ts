"use server";

import { UserRole } from "@prisma/client";

import { isPlatformAdministratorIdentity } from "@/app/lib/auth/platformAdminAccess";
import { normalizeProvisionedTenantSlug } from "@/app/lib/tenantSlugRegistry";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import prisma from "@/lib/prisma";

const TENANT_AUDIT_PRIVILEGED_ROLES: UserRole[] = [
  UserRole.CISO,
  UserRole.GRC_MANAGER,
  UserRole.DIRECTOR_OF_COMPLIANCE,
  UserRole.INTERNAL_AUDITOR,
  UserRole.GLOBAL_ADMIN,
];

const BOARDROOM_AUDIT_NAV_ROLES: UserRole[] = [
  UserRole.CISO,
  UserRole.GRC_MANAGER,
  UserRole.GLOBAL_ADMIN,
];

export interface SerializedAuditLog {
  id: string;
  action: string;
  tenantSlug: string;
  amountReceivedCents: string;
  createdAt: string;
}

function extractAmountReceivedCents(justification: string | null | undefined): string {
  const raw = justification ?? "";
  const match = raw.match(/amount_received_cents=(\d+)/);
  return match?.[1] ?? "0";
}

/** Header nav gate — CISO, GRC_MANAGER, or GLOBAL_ADMIN on active tenant (or platform admin). */
export async function canAccessBoardroomSecurityAuditNav(): Promise<boolean> {
  const user = await getSupabaseSessionUser();
  if (!user?.id?.trim()) return false;

  if (await isPlatformAdministratorIdentity(user.id, user.email)) {
    return true;
  }

  const tenantId = await getActiveTenantUuidFromCookies();
  if (!tenantId) return false;

  const assignment = await prisma.userRoleAssignment.findFirst({
    where: {
      userId: user.id.trim(),
      tenantId,
      role: { in: BOARDROOM_AUDIT_NAV_ROLES },
    },
    select: { id: true },
  });

  return Boolean(assignment?.id);
}

export async function getSecureAuditLogs(tenantSlugRaw: string): Promise<SerializedAuditLog[]> {
  const user = await getSupabaseSessionUser();
  if (!user?.id?.trim()) {
    throw new Error("UNAUTHORIZED_ACCESS_DENIED");
  }

  const tenantSlug = normalizeProvisionedTenantSlug(tenantSlugRaw.trim());
  if (!tenantSlug) {
    throw new Error("ACCESS_VIOLATION: Invalid tenant workspace slug.");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true, slug: true },
  });

  if (!tenant) {
    throw new Error("ACCESS_VIOLATION: Target tenant workspace is not provisioned.");
  }

  const isPlatformAdmin = await isPlatformAdministratorIdentity(user.id, user.email);
  if (!isPlatformAdmin) {
    const assignment = await prisma.userRoleAssignment.findFirst({
      where: {
        userId: user.id.trim(),
        tenantId: tenant.id,
        role: { in: TENANT_AUDIT_PRIVILEGED_ROLES },
      },
      select: { id: true },
    });

    if (!assignment) {
      throw new Error("ACCESS_VIOLATION: Insufficient privileges for target tenant workspace.");
    }
  }

  const logs = await prisma.auditLog.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      action: true,
      justification: true,
      createdAt: true,
    },
  });

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    tenantSlug: tenant.slug,
    amountReceivedCents: extractAmountReceivedCents(log.justification),
    createdAt: log.createdAt.toISOString(),
  }));
}
