"use server";

import { requirePlatformAdministrator } from "@/app/lib/auth/platformAdminAccess";
import {
  createWorkspaceInvitation,
  type CreateWorkspaceInvitationResult,
} from "@/app/lib/auth/workspaceInvitationCore";

export type MintWorkspaceInvitationResult = CreateWorkspaceInvitationResult;

export async function mintWorkspaceInvitationAction(
  formData: FormData,
): Promise<MintWorkspaceInvitationResult> {
  const admin = await requirePlatformAdministrator();
  if ("error" in admin) {
    return { ok: false, error: admin.error };
  }

  const email = String(formData.get("email") ?? "").trim() || null;
  const tenantSlug = String(formData.get("tenantSlug") ?? "").trim() || null;
  const ttlDaysRaw = String(formData.get("ttlDays") ?? "14").trim();
  const ttlDays = Number.parseInt(ttlDaysRaw, 10);

  return createWorkspaceInvitation({
    operatorId: admin.userId,
    email,
    tenantSlug,
    ttlDays: Number.isFinite(ttlDays) && ttlDays > 0 ? ttlDays : 14,
  });
}
