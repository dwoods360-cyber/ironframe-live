"use server";

import { revalidatePath } from "next/cache";

import {
  assertTenantSlugInPartnerScope,
  requirePartnerProvisioner,
} from "@/app/lib/auth/partnerProvisionerAccess";
import { requireManualBillingActivationAuthority } from "@/app/lib/auth/billingManualOverrideAccess";
import {
  setTenantBillingStatus,
} from "@/app/lib/billing/tenantBillingEntitlement";
import { TENANT_BILLING_STATUS, type TenantBillingStatus } from "@/app/lib/billing/constants";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";

export type SetTenantBillingStatusResult =
  | { ok: true; tenantSlug: string; status: TenantBillingStatus }
  | { ok: false; error: string };

const ALLOWED_STATUSES = new Set<string>(Object.values(TENANT_BILLING_STATUS));

export async function setTenantBillingStatusAction(
  tenantSlug: string,
  statusRaw: string,
): Promise<SetTenantBillingStatusResult> {
  const gate = await requirePartnerProvisioner();
  if ("error" in gate) {
    return { ok: false, error: gate.error };
  }

  const scopeCheck = await assertTenantSlugInPartnerScope(gate, tenantSlug);
  if (!scopeCheck.ok) {
    return { ok: false, error: scopeCheck.error };
  }

  const status = statusRaw.trim().toUpperCase();
  if (!ALLOWED_STATUSES.has(status)) {
    return { ok: false, error: "Invalid billing status." };
  }

  if (status === TENANT_BILLING_STATUS.ACTIVE) {
    const manualGate = await requireManualBillingActivationAuthority();
    if ("error" in manualGate) {
      return { ok: false, error: manualGate.error };
    }
  }

  const slug = tenantSlug.trim().toLowerCase();
  if (!slug) {
    return { ok: false, error: "Tenant slug is required." };
  }

  try {
    await setTenantBillingStatus(slug, status as TenantBillingStatus);

    try {
      await auditLogCreateLoose({
        data: {
          action: "TENANT_BILLING_STATUS_UPDATE",
          operatorId: gate.userId,
          justification: `[ONBOARDING] billing status=${status} tenant=${slug}`,
          threatId: null,
          isSimulation: false,
        },
      });
    } catch (auditError) {
      console.warn("[setTenantBillingStatusAction] audit log skipped:", auditError);
    }

    revalidatePath("/admin/onboarding");
    revalidatePath("/admin/billing");

    return { ok: true, tenantSlug: slug, status: status as TenantBillingStatus };
  } catch (e) {
    console.error("[setTenantBillingStatusAction]", e);
    return { ok: false, error: "Failed to update billing status." };
  }
}
