import "server-only";

import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import { isPlatformAdministratorIdentity } from "@/app/lib/auth/platformAdminAccess";

async function resolveDesignatedBusinessAdminAssignment(userId: string): Promise<boolean> {
  const businessAdmin = await prisma.userRoleAssignment.findFirst({
    where: { userId, role: UserRole.BUSINESS_ADMIN },
    select: { id: true },
  });
  return Boolean(businessAdmin?.id);
}

/**
 * Perimeter poll workers (:8082–:8086) and the Operations Command Center —
 * GLOBAL_ADMIN or explicitly designated BUSINESS_ADMIN assignments only.
 */
export async function canUsePerimeterWorkforce(
  userId: string,
  email?: string | null,
): Promise<boolean> {
  const uid = userId.trim();
  if (!uid) return false;

  if (await isPlatformAdministratorIdentity(uid, email)) {
    return true;
  }

  return resolveDesignatedBusinessAdminAssignment(uid);
}

export async function canUsePerimeterWorkforceFromSession(): Promise<boolean> {
  const user = await getSupabaseSessionUser();
  if (!user?.id?.trim()) return false;
  return canUsePerimeterWorkforce(user.id, user.email);
}

export async function requirePerimeterWorkforceOperator(): Promise<
  { userId: string } | { error: string }
> {
  const user = await getSupabaseSessionUser();
  if (!user?.id?.trim()) {
    return { error: "Perimeter workforce operator session required." };
  }

  const allowed = await canUsePerimeterWorkforce(user.id, user.email);
  if (!allowed) {
    return {
      error: "GLOBAL_ADMIN or designated BUSINESS_ADMIN role required for perimeter workforce access.",
    };
  }

  return { userId: user.id.trim() };
}
