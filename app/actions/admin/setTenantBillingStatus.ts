"use server";

import { requirePlatformAdministrator } from "@/app/lib/auth/platformAdminAccess";
import {
  setTenantBillingStatus,
} from "@/app/lib/billing/tenantBillingEntitlement";
import { TENANT_BILLING_STATUS, type TenantBillingStatus } from "@/app/lib/billing/constants";

export type SetTenantBillingStatusResult =
  | { ok: true; tenantSlug: string; status: TenantBillingStatus }
  | { ok: false; error: string };

const ALLOWED_STATUSES = new Set<string>(Object.values(TENANT_BILLING_STATUS));

export async function setTenantBillingStatusAction(
  tenantSlug: string,
  statusRaw: string,
): Promise<SetTenantBillingStatusResult> {
  const admin = await requirePlatformAdministrator();
  if ("error" in admin) {
    return { ok: false, error: admin.error };
  }

  const status = statusRaw.trim().toUpperCase();
  if (!ALLOWED_STATUSES.has(status)) {
    return { ok: false, error: "Invalid billing status." };
  }

  const slug = tenantSlug.trim().toLowerCase();
  if (!slug) {
    return { ok: false, error: "Tenant slug is required." };
  }

  try {
    await setTenantBillingStatus(slug, status as TenantBillingStatus);
    return { ok: true, tenantSlug: slug, status: status as TenantBillingStatus };
  } catch (e) {
    console.error("[setTenantBillingStatusAction]", e);
    return { ok: false, error: "Failed to update billing status." };
  }
}
