"use server";

import {
  TENANT_CONTACT_PROFILE_SCHEMA_VERSION,
  tenantContactProfileIngressSchema,
} from "@/app/lib/ingress/tenantContactProfileIngressSchema";
import { syncTenantContactProfileFromIngress } from "@/app/lib/ingress/syncTenantContactProfileFromIngress";
import {
  ensureDashboardTenantSession,
  resolveDashboardAccess,
} from "@/app/lib/auth/dashboardRoleAccess";
import { canEditWorkspaceProfile } from "@/app/lib/auth/workspaceProfileEditorAccess";
import { getScopedTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

export type SyncTenantContactProfileActionResult =
  | { ok: true; created: boolean }
  | { ok: false; error: string };

export async function syncTenantContactProfileAction(input: {
  corporatePhone?: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  addressCountry?: string;
  billingContactEmail?: string;
  taxId?: string;
}): Promise<SyncTenantContactProfileActionResult> {
  const access = await ensureDashboardTenantSession(await resolveDashboardAccess());
  if (access.status !== "allowed") {
    return { ok: false, error: "Sign in to configure workspace contact details." };
  }

  const scopedTenantUuid = await getScopedTenantUuidFromCookies();
  const tenantUuid = scopedTenantUuid ?? access.tenantUuid;

  const canEdit = await canEditWorkspaceProfile(access.userId, tenantUuid);
  if (!canEdit) {
    return {
      ok: false,
      error: "Workspace contact edits require GRC Manager or CISO role.",
    };
  }

  const parsed = tenantContactProfileIngressSchema.safeParse({
    schemaVersion: TENANT_CONTACT_PROFILE_SCHEMA_VERSION,
    tenantId: tenantUuid,
    corporatePhone: input.corporatePhone,
    addressStreet: input.addressStreet,
    addressCity: input.addressCity,
    addressState: input.addressState,
    addressZip: input.addressZip,
    addressCountry: input.addressCountry,
    billingContactEmail: input.billingContactEmail,
    taxId: input.taxId,
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? "Contact profile validation failed.",
    };
  }

  try {
    const result = await syncTenantContactProfileFromIngress(tenantUuid, parsed.data);
    return { ok: true, created: result.created };
  } catch (error) {
    console.error("[syncTenantContactProfileAction]", error);
    return { ok: false, error: "Could not save workspace contact details. Retry in a moment." };
  }
}
