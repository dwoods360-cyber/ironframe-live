"use server";

import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import { requirePartnerProvisioner } from "@/app/lib/auth/partnerProvisionerAccess";
import { linkPartnerProvisionerToClientTenant } from "@/app/lib/server/partnerProvisionerTenantLink";
import {
  provisionCorporateTenantCore,
  type ProvisionCorporateTenantCoreResult,
} from "@/app/lib/server/corporateTenantProvisionCore";

export type ProvisionCorporateTenantResult = ProvisionCorporateTenantCoreResult;

export async function provisionCorporateTenantAction(
  formData: FormData,
): Promise<ProvisionCorporateTenantResult> {
  const gate = await requirePartnerProvisioner();
  if ("error" in gate) {
    return { ok: false, error: gate.error };
  }

  const user = await getSupabaseSessionUser();
  const slugRaw = String(formData.get("slug") ?? "");
  const result = await provisionCorporateTenantCore({
    name: String(formData.get("name") ?? ""),
    slugRaw,
    industry: String(formData.get("industry") ?? "") || null,
    aleBaselineCentsRaw: String(formData.get("aleBaselineCents") ?? "0"),
    operatorId: gate.userId,
    skipInvitationGate: true,
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
