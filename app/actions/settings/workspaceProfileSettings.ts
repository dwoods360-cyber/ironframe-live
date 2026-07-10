"use server";

import { revalidatePath } from "next/cache";

import {
  ensureDashboardTenantSession,
  resolveDashboardAccess,
} from "@/app/lib/auth/dashboardRoleAccess";
import { canEditWorkspaceProfile } from "@/app/lib/auth/workspaceProfileEditorAccess";
import { syncCompanyProfileAction } from "@/app/actions/getStarted/syncCompanyProfile";
import { syncTenantContactProfileAction } from "@/app/actions/getStarted/syncTenantContactProfile";
import { updateWorkspaceAleBaselineAction } from "@/app/actions/getStarted/updateWorkspaceAleBaseline";
import { logWorkspaceProfileAudit } from "@/app/lib/server/logWorkspaceProfileAudit";
import { getScopedTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

async function resolveSettingsTenantContext() {
  const access = await ensureDashboardTenantSession(await resolveDashboardAccess());
  if (access.status !== "allowed") {
    return { ok: false as const, error: "Sign in to manage workspace settings." };
  }

  const scopedTenantUuid = await getScopedTenantUuidFromCookies();
  const tenantUuid = scopedTenantUuid ?? access.tenantUuid;

  const canEdit = await canEditWorkspaceProfile(access.userId, tenantUuid);
  if (!canEdit) {
    return {
      ok: false as const,
      error: "Workspace profile edits require GRC Manager or CISO role.",
    };
  }

  return { ok: true as const, access, tenantUuid };
}

export async function updateWorkspaceAleBaselineSettingsAction(aleBaselineDollars: string) {
  const ctx = await resolveSettingsTenantContext();
  if (!ctx.ok) return ctx;

  const result = await updateWorkspaceAleBaselineAction(aleBaselineDollars);
  if (!result.ok) return result;

  await logWorkspaceProfileAudit({
    tenantUuid: ctx.tenantUuid,
    operatorId: ctx.access.userId,
    action: "WORKSPACE_ALE_BASELINE_UPDATED",
    summary: `ale_baseline_cents=${result.aleBaselineCents}`,
  });

  revalidatePath("/settings/workspace");
  revalidatePath("/get-started");
  return result;
}

export async function syncCompanyProfileSettingsAction(input: {
  companyName: string;
  sector: string;
  departmentsRaw?: string;
}) {
  const ctx = await resolveSettingsTenantContext();
  if (!ctx.ok) return ctx;

  const result = await syncCompanyProfileAction(input);
  if (!result.ok) return result;

  await logWorkspaceProfileAudit({
    tenantUuid: ctx.tenantUuid,
    operatorId: ctx.access.userId,
    action: "WORKSPACE_COMPANY_PROFILE_UPDATED",
    summary: `company_id=${result.companyId}; departments_synced=${result.departmentsSynced}; created=${result.created}`,
  });

  revalidatePath("/settings/workspace");
  revalidatePath("/get-started");
  return result;
}

export async function syncTenantContactProfileSettingsAction(input: {
  corporatePhone?: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  addressCountry?: string;
  billingContactEmail?: string;
  taxId?: string;
}) {
  const ctx = await resolveSettingsTenantContext();
  if (!ctx.ok) return ctx;

  const result = await syncTenantContactProfileAction(input);
  if (!result.ok) return result;

  await logWorkspaceProfileAudit({
    tenantUuid: ctx.tenantUuid,
    operatorId: ctx.access.userId,
    action: "WORKSPACE_CONTACT_PROFILE_UPDATED",
    summary: `created=${result.created}`,
  });

  revalidatePath("/settings/workspace");
  revalidatePath("/get-started");
  return result;
}

export async function resolveWorkspaceSettingsEditorAccess(): Promise<{
  canEdit: boolean;
  roleBlocked: boolean;
}> {
  const access = await ensureDashboardTenantSession(await resolveDashboardAccess());
  if (access.status !== "allowed") {
    return { canEdit: false, roleBlocked: false };
  }

  const scopedTenantUuid = await getScopedTenantUuidFromCookies();
  const tenantUuid = scopedTenantUuid ?? access.tenantUuid;
  const canEdit = await canEditWorkspaceProfile(access.userId, tenantUuid);
  return { canEdit, roleBlocked: !canEdit };
}
