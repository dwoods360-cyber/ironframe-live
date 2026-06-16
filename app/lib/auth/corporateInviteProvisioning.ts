import "server-only";

import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { lookupTenantBySlug } from "@/app/lib/tenantSlugRegistry";
import { normalizeTenantSlugInput } from "@/app/lib/tenantSubdomain";

/** Ensure invited corporate users receive RBAC on first auth callback. */
export async function ensureCorporateInviteRoleAssignment(
  userId: string,
  tenantSlugRaw: string,
  role: UserRole = UserRole.GRC_MANAGER,
): Promise<void> {
  const userIdTrim = userId.trim();
  const slug = normalizeTenantSlugInput(tenantSlugRaw);
  if (!userIdTrim || !slug) return;

  const tenant = await lookupTenantBySlug(slug);
  if (!tenant) return;

  const existing = await prisma.userRoleAssignment.findFirst({
    where: { userId: userIdTrim, tenantId: tenant.id },
    select: { id: true },
  });
  if (existing) return;

  await prisma.userRoleAssignment.create({
    data: {
      userId: userIdTrim,
      tenantId: tenant.id,
      role,
    },
  });
}
