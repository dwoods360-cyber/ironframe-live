"use server";

import { requirePlatformAdministrator } from "@/app/lib/auth/platformAdminAccess";
import {
  quickProvisionCorporateWorkspaceCore,
  type QuickProvisionCorporateWorkspaceResult,
} from "@/app/lib/server/quickProvisionCorporateWorkspaceCore";

export type QuickProvisionCorporateWorkspaceActionResult = QuickProvisionCorporateWorkspaceResult;

export async function quickProvisionCorporateWorkspaceAction(
  formData: FormData,
): Promise<QuickProvisionCorporateWorkspaceActionResult> {
  const admin = await requirePlatformAdministrator();
  if ("error" in admin) {
    return { ok: false, error: admin.error };
  }

  return quickProvisionCorporateWorkspaceCore({
    operatorId: admin.userId,
    email: String(formData.get("email") ?? ""),
    name: String(formData.get("name") ?? ""),
    slugRaw: String(formData.get("slug") ?? ""),
  });
}
