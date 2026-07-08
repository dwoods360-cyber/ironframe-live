"use server";

import { revalidatePath } from "next/cache";

import { ADMIN_BILLING_PATH } from "@/app/lib/auth/adminBillingRoute";
import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import {
  TENANT_BILLING_STATUS,
  type TenantBillingStatus,
} from "@/app/lib/billing/constants";
import {
  setTenantBillingStatus,
} from "@/app/lib/billing/tenantBillingEntitlement";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";

export type TenantBillingAdminActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

function normalizeBillingStatus(raw: string): TenantBillingStatus | null {
  const status = raw.trim().toUpperCase();
  if (status === TENANT_BILLING_STATUS.PENDING) return TENANT_BILLING_STATUS.PENDING;
  if (status === TENANT_BILLING_STATUS.ACTIVE) return TENANT_BILLING_STATUS.ACTIVE;
  if (status === TENANT_BILLING_STATUS.PAST_DUE) return TENANT_BILLING_STATUS.PAST_DUE;
  return null;
}

async function logBillingAdminMutation(
  operatorId: string,
  tenantSlug: string,
  detail: string,
): Promise<void> {
  try {
    await auditLogCreateLoose({
      data: {
        action: "TENANT_BILLING_STATUS_UPDATE",
        justification: `[BILLING_ADMIN] operator=${operatorId} tenant=${tenantSlug} ${detail}`,
        operatorId,
        threatId: null,
        isSimulation: false,
      },
    });
  } catch (error) {
    console.warn("[tenantBillingAdminActions] audit log skipped:", error);
  }
}

function revalidateBillingSurfaces(): void {
  revalidatePath(ADMIN_BILLING_PATH);
  revalidatePath("/admin/onboarding");
}

export async function updateTenantBillingStatusAction(
  tenantSlug: string,
  status: string,
): Promise<TenantBillingAdminActionResult> {
  try {
    const gate = await requirePerimeterWorkforceOperator();
    if ("error" in gate) {
      return { ok: false, error: gate.error };
    }

    const slug = tenantSlug.trim().toLowerCase();
    const normalized = normalizeBillingStatus(status);
    if (!slug || !normalized) {
      return { ok: false, error: "Invalid tenant slug or billing status." };
    }

    await setTenantBillingStatus(slug, normalized);
    await logBillingAdminMutation(gate.userId, slug, `status=${normalized}`);
    revalidateBillingSurfaces();

    return { ok: true, message: `Workspace "${slug}" billing set to ${normalized}.` };
  } catch (error) {
    console.error("[updateTenantBillingStatusAction]", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not update tenant billing status.",
    };
  }
}

/** Seed or reset a tenant into the PENDING hold state for gate testing. */
export async function seedTenantBillingPendingAction(
  tenantSlug: string,
): Promise<TenantBillingAdminActionResult> {
  try {
    const gate = await requirePerimeterWorkforceOperator();
    if ("error" in gate) {
      return { ok: false, error: gate.error };
    }

    const slug = tenantSlug.trim().toLowerCase();
    if (!slug) {
      return { ok: false, error: "Tenant slug is required." };
    }

    await setTenantBillingStatus(slug, TENANT_BILLING_STATUS.PENDING);
    await logBillingAdminMutation(gate.userId, slug, "seeded=PENDING");
    revalidateBillingSurfaces();

    return { ok: true, message: `Workspace "${slug}" placed on PENDING billing hold.` };
  } catch (error) {
    console.error("[seedTenantBillingPendingAction]", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not seed billing hold.",
    };
  }
}
