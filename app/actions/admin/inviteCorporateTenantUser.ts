"use server";

import { UserRole } from "@prisma/client";

import {
  assertTenantSlugInPartnerScope,
  requirePartnerProvisioner,
} from "@/app/lib/auth/partnerProvisionerAccess";
import {
  inviteCorporateTenantUserCore,
  type InviteCorporateTenantUserCoreResult,
} from "@/app/lib/server/corporateTenantProvisionCore";

export type InviteCorporateTenantUserResult = InviteCorporateTenantUserCoreResult;

export async function inviteCorporateTenantUserAction(
  formData: FormData,
): Promise<InviteCorporateTenantUserResult> {
  const gate = await requirePartnerProvisioner();
  if ("error" in gate) {
    return { ok: false, error: gate.error };
  }

  const tenantSlugRaw = String(formData.get("tenantSlug") ?? "");
  const scopeCheck = await assertTenantSlugInPartnerScope(gate, tenantSlugRaw);
  if (!scopeCheck.ok) {
    return { ok: false, error: scopeCheck.error };
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
    tenantSlugRaw,
    operatorId: gate.userId,
    role: inviteRole,
  });
}
