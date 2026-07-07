import "server-only";

import prisma from "@/lib/prisma";
import { isPlatformGlobalAdminEmail } from "@/config/platformSecurity";
import { lookupTenantBySlug } from "@/app/lib/tenantSlugRegistry";

/**
 * Resolve the tenant slug for apex post-auth redirects.
 * Prefers metadata slug when the operator has an RBAC assignment on that workspace,
 * or when the session is the canonical platform GLOBAL_ADMIN email.
 * Otherwise falls back to the most recently granted assignment.
 */
export async function resolveApexWorkspaceLandingSlug(
  userId: string,
  metadataTenantSlug: string | null,
  email?: string | null,
): Promise<string | null> {
  const trimmedUserId = userId.trim();
  if (!trimmedUserId) return null;

  if (metadataTenantSlug) {
    const metadataTenant = await lookupTenantBySlug(metadataTenantSlug);
    if (metadataTenant) {
      if (isPlatformGlobalAdminEmail(email)) {
        return metadataTenant.slug;
      }
      const metadataAssignment = await prisma.userRoleAssignment.findFirst({
        where: { userId: trimmedUserId, tenantId: metadataTenant.id },
        select: { id: true },
      });
      if (metadataAssignment) return metadataTenant.slug;
    }
  }

  const primaryAssignment = await prisma.userRoleAssignment.findFirst({
    where: { userId: trimmedUserId },
    select: { tenantId: true },
    orderBy: [{ grantedAt: "desc" }, { tenantId: "asc" }],
  });

  if (!primaryAssignment?.tenantId) return null;

  const primaryTenant = await prisma.tenant.findUnique({
    where: { id: primaryAssignment.tenantId },
    select: { slug: true },
  });

  return primaryTenant?.slug ?? null;
}
