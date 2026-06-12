import prisma from "@/lib/prisma";
import { isDevConstitutionalAuthorityUser } from "@/app/lib/grc/devConstitutionalElevation";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import {
  getScopedTenantUuidFromCookies,
  isValidTenantUuid,
} from "@/app/utils/serverTenantContext";

export type DashboardAccessResult =
  | { status: "allowed"; userId: string; tenantUuid: string | null }
  | { status: "unauthenticated" }
  | { status: "pending"; userId: string; tenantUuid: string | null };

/**
 * Zero-trust dashboard gate: authenticated Supabase users without a matching
 * `user_role_assignments` row must not enter dashboard shells (no throw).
 */
export async function resolveDashboardAccess(): Promise<DashboardAccessResult> {
  const user = await getSupabaseSessionUser();
  if (!user) {
    return { status: "unauthenticated" };
  }

  const userId = typeof user.id === "string" ? user.id.trim() : "";
  if (!userId) {
    return { status: "unauthenticated" };
  }

  const scopedRaw = await getScopedTenantUuidFromCookies();
  const tenantUuid =
    scopedRaw && isValidTenantUuid(scopedRaw) ? scopedRaw.trim() : null;

  if (isDevConstitutionalAuthorityUser(user)) {
    return { status: "allowed", userId, tenantUuid };
  }

  if (tenantUuid) {
    const scopedAssignment = await prisma.userRoleAssignment.findFirst({
      where: { userId, tenantId: tenantUuid },
      select: { id: true },
    });
    if (scopedAssignment) {
      return { status: "allowed", userId, tenantUuid };
    }
  }

  const anyAssignment = await prisma.userRoleAssignment.findFirst({
    where: { userId },
    select: { id: true, tenantId: true },
    orderBy: { grantedAt: "desc" },
  });

  if (anyAssignment) {
    return {
      status: "allowed",
      userId,
      tenantUuid: tenantUuid ?? anyAssignment.tenantId,
    };
  }

  return { status: "pending", userId, tenantUuid };
}
