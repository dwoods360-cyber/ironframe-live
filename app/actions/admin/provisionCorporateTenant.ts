"use server";

import { requirePlatformAdministrator } from "@/app/lib/auth/platformAdminAccess";
import {
  provisionCorporateTenantCore,
  type ProvisionCorporateTenantCoreResult,
} from "@/app/lib/server/corporateTenantProvisionCore";

export type ProvisionCorporateTenantResult = ProvisionCorporateTenantCoreResult;

export async function provisionCorporateTenantAction(
  formData: FormData,
): Promise<ProvisionCorporateTenantResult> {
  const admin = await requirePlatformAdministrator();
  if ("error" in admin) {
    return { ok: false, error: admin.error };
  }

  return provisionCorporateTenantCore({
    name: String(formData.get("name") ?? ""),
    slugRaw: String(formData.get("slug") ?? ""),
    industry: String(formData.get("industry") ?? "") || null,
    aleBaselineCentsRaw: String(formData.get("aleBaselineCents") ?? "0"),
    operatorId: admin.userId,
  });
}
