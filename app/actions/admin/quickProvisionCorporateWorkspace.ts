"use server";

import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import {
  assertTenantSlugInPartnerScope,
  requirePartnerProvisioner,
} from "@/app/lib/auth/partnerProvisionerAccess";
import { linkPartnerProvisionerToClientTenant } from "@/app/lib/server/partnerProvisionerTenantLink";
import {
  quickProvisionCorporateWorkspaceCore,
  type QuickProvisionCorporateWorkspaceResult,
} from "@/app/lib/server/quickProvisionCorporateWorkspaceCore";

export type QuickProvisionCorporateWorkspaceActionResult = QuickProvisionCorporateWorkspaceResult;

export async function quickProvisionCorporateWorkspaceAction(
  formData: FormData,
): Promise<QuickProvisionCorporateWorkspaceActionResult> {
  const gate = await requirePartnerProvisioner();
  if ("error" in gate) {
    return { ok: false, error: gate.error };
  }

  const user = await getSupabaseSessionUser();
  const result = await quickProvisionCorporateWorkspaceCore({
    operatorId: gate.userId,
    email: String(formData.get("email") ?? ""),
    name: String(formData.get("name") ?? ""),
    slugRaw: String(formData.get("slug") ?? ""),
  });

  if (result.ok) {
    await linkPartnerProvisionerToClientTenant({
      operatorId: gate.userId,
      operatorEmail: user?.email,
      tenantSlug: result.slug,
    });
  }

  return result;
}
