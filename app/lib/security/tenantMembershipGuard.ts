import "server-only";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isPlatformAdministratorIdentity } from "@/app/lib/auth/platformAdminAccess";
import { isDevConstitutionalAuthorityUser } from "@/app/lib/grc/devConstitutionalElevation";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import { assertIronguardApiTenantOr403 } from "@/app/lib/security/ironguardApiGuard";

export async function userHasTenantRoleAssignment(
  userId: string,
  tenantUuid: string,
): Promise<boolean> {
  const uid = userId.trim();
  const tid = tenantUuid.trim();
  if (!uid || !tid) return false;

  const row = await prisma.userRoleAssignment.findFirst({
    where: { userId: uid, tenantId: tid },
    select: { id: true },
  });
  return Boolean(row);
}

export type AuthenticatedTenantGuardResult =
  | {
      ok: true;
      tenantUuid: string;
      userId: string | null;
      membershipEnforced: boolean;
    }
  | { ok: false; response: NextResponse };

/**
 * Ironguard tenant scope + authenticated operator must hold `user_role_assignment` for that tenant.
 * Unauthenticated simulation/shadow clients keep Ironguard-only behavior (no membership row).
 * Platform administrators and constitutional dev authority bypass membership for cross-tenant ops.
 */
export async function assertAuthenticatedIronguardTenantOr403(
  request: NextRequest,
): Promise<AuthenticatedTenantGuardResult> {
  const guard = await assertIronguardApiTenantOr403(request);
  if (!guard.ok) {
    return { ok: false, response: guard.response };
  }

  const user = await getSupabaseSessionUser();
  if (!user?.id?.trim()) {
    return {
      ok: true,
      tenantUuid: guard.tenantUuid,
      userId: null,
      membershipEnforced: false,
    };
  }

  const userId = user.id.trim();

  if (isDevConstitutionalAuthorityUser(user)) {
    return {
      ok: true,
      tenantUuid: guard.tenantUuid,
      userId,
      membershipEnforced: false,
    };
  }

  const platformAdmin = await isPlatformAdministratorIdentity(userId, user.email);
  if (platformAdmin) {
    return {
      ok: true,
      tenantUuid: guard.tenantUuid,
      userId,
      membershipEnforced: false,
    };
  }

  const hasAssignment = await userHasTenantRoleAssignment(userId, guard.tenantUuid);
  if (!hasAssignment) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Workspace access revoked or not assigned for this tenant. Sign in again or contact your administrator.",
        },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true,
    tenantUuid: guard.tenantUuid,
    userId,
    membershipEnforced: true,
  };
}
