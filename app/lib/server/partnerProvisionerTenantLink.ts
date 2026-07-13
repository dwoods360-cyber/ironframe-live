import "server-only";

import { UserRole } from "@prisma/client";

import { isPlatformAdministratorIdentity } from "@/app/lib/auth/platformAdminAccess";
import prisma from "@/lib/prisma";

/**
 * When a partner (non-GLOBAL_ADMIN) provisions a client workspace, grant them
 * BUSINESS_ADMIN on that tenant so the client list and switcher stay in scope.
 */
export async function linkPartnerProvisionerToClientTenant(input: {
  operatorId: string;
  operatorEmail?: string | null;
  tenantSlug: string;
}): Promise<void> {
  const operatorId = input.operatorId.trim();
  const tenantSlug = input.tenantSlug.trim().toLowerCase();
  if (!operatorId || !tenantSlug) return;

  if (await isPlatformAdministratorIdentity(operatorId, input.operatorEmail)) {
    return;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) return;

  const existing = await prisma.userRoleAssignment.findFirst({
    where: { userId: operatorId, tenantId: tenant.id },
    select: { id: true },
  });
  if (existing) return;

  await prisma.userRoleAssignment.create({
    data: {
      userId: operatorId,
      tenantId: tenant.id,
      role: UserRole.BUSINESS_ADMIN,
    },
  });
}
