"use server";

import {
  assertTenantSlugInPartnerScope,
  requirePartnerProvisioner,
} from "@/app/lib/auth/partnerProvisionerAccess";
import {
  createWorkspaceInvitation,
  type CreateWorkspaceInvitationResult,
} from "@/app/lib/auth/workspaceInvitationCore";

export type MintWorkspaceInvitationResult = CreateWorkspaceInvitationResult;

export async function mintWorkspaceInvitationAction(
  formData: FormData,
): Promise<MintWorkspaceInvitationResult> {
  const gate = await requirePartnerProvisioner();
  if ("error" in gate) {
    return { ok: false, error: gate.error };
  }

  const tenantSlug = String(formData.get("tenantSlug") ?? "").trim() || null;
  if (tenantSlug) {
    const scopeCheck = await assertTenantSlugInPartnerScope(gate, tenantSlug);
    if (!scopeCheck.ok) {
      return { ok: false, error: scopeCheck.error };
    }
  }

  const email = String(formData.get("email") ?? "").trim() || null;
  const ttlDaysRaw = String(formData.get("ttlDays") ?? "14").trim();
  const ttlDays = Number.parseInt(ttlDaysRaw, 10);

  return createWorkspaceInvitation({
    operatorId: gate.userId,
    email,
    tenantSlug,
    ttlDays: Number.isFinite(ttlDays) && ttlDays > 0 ? ttlDays : 14,
  });
}
