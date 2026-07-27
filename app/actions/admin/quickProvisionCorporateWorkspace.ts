"use server";

import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import { requirePartnerProvisioner } from "@/app/lib/auth/partnerProvisionerAccess";
import { linkPartnerProvisionerToClientTenant } from "@/app/lib/server/partnerProvisionerTenantLink";
import {
  consumeOrderFormAgreedHandoff,
  requireActiveOrderFormAgreedHandoff,
} from "@/app/lib/server/orderFormAgreedHandoffCore";
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

  const handoffToken = String(formData.get("handoffToken") ?? "").trim();
  let email = String(formData.get("email") ?? "");
  let name = String(formData.get("name") ?? "");
  let slugRaw = String(formData.get("slug") ?? "");

  if (handoffToken) {
    const trusted = await requireActiveOrderFormAgreedHandoff(handoffToken);
    if (!trusted.ok) {
      return { ok: false, error: trusted.error };
    }
    // SoD: party fields come from the AGREED handoff, not a tampered form post.
    name = trusted.handoff.customerLegalName;
    email = trusted.handoff.operatorEmail;
    slugRaw = trusted.handoff.workspaceSlug;
  }

  const user = await getSupabaseSessionUser();
  const result = await quickProvisionCorporateWorkspaceCore({
    operatorId: gate.userId,
    email,
    name,
    slugRaw,
  });

  if (result.ok) {
    await linkPartnerProvisionerToClientTenant({
      operatorId: gate.userId,
      operatorEmail: user?.email,
      tenantSlug: result.slug,
    });
    if (handoffToken) {
      await consumeOrderFormAgreedHandoff(handoffToken).catch((err) => {
        console.warn("[quick-provision] handoff consume failed", err);
      });
    }
  }

  return result;
}
