"use server";

import { UserRole } from "@prisma/client";
import { requirePlatformAdministrator } from "@/app/lib/auth/platformAdminAccess";
import {
  inviteCorporateTenantUserCore,
  type InviteCorporateTenantUserCoreResult,
} from "@/app/lib/server/corporateTenantProvisionCore";

export type InviteCorporateTenantUserResult = InviteCorporateTenantUserCoreResult;

export async function inviteCorporateTenantUserAction(
  formData: FormData,
): Promise<InviteCorporateTenantUserResult> {
  const admin = await requirePlatformAdministrator();
  if ("error" in admin) {
    return { ok: false, error: admin.error };
  }

  const inviteRoleRaw = String(formData.get("role") ?? "GRC_MANAGER").trim().toUpperCase();
  const inviteRole =
    inviteRoleRaw === "CISO"
      ? UserRole.CISO
      : inviteRoleRaw === "BUSINESS_ADMIN"
        ? UserRole.BUSINESS_ADMIN
        : inviteRoleRaw === "GRC_MANAGER"
          ? UserRole.GRC_MANAGER
          : UserRole.GRC_MANAGER;

  return inviteCorporateTenantUserCore({
    email: String(formData.get("email") ?? ""),
    tenantSlugRaw: String(formData.get("tenantSlug") ?? ""),
    operatorId: admin.userId,
    role: inviteRole,
  });
}
