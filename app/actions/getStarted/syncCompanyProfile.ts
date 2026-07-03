"use server";

import {
  COMPANY_PROFILE_SCHEMA_VERSION,
  companyProfileIngressSchema,
} from "@/app/lib/ingress/companyProfileIngressSchema";
import { syncCompanyProfileFromIngress } from "@/app/lib/ingress/syncCompanyProfileFromIngress";
import {
  ensureDashboardTenantSession,
  resolveDashboardAccess,
} from "@/app/lib/auth/dashboardRoleAccess";
import { getScopedTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import prisma from "@/lib/prisma";

export type SyncCompanyProfileActionResult =
  | {
      ok: true;
      companyId: string;
      created: boolean;
      departmentsSynced: number;
    }
  | { ok: false; error: string };

export async function syncCompanyProfileAction(input: {
  companyName: string;
  sector: string;
  departmentsRaw?: string;
}): Promise<SyncCompanyProfileActionResult> {
  const access = await ensureDashboardTenantSession(await resolveDashboardAccess());
  if (access.status !== "allowed") {
    return { ok: false, error: "Sign in to configure the workspace company profile." };
  }

  const scopedTenantUuid = await getScopedTenantUuidFromCookies();
  const tenantUuid = scopedTenantUuid ?? access.tenantUuid;

  const assignment = await prisma.userRoleAssignment.findFirst({
    where: { userId: access.userId, tenantId: tenantUuid },
    select: { id: true },
  });
  if (!assignment) {
    return { ok: false, error: "You are not assigned to this workspace." };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantUuid },
    select: { ale_baseline: true },
  });
  if (!tenant) {
    return { ok: false, error: "Workspace tenant not found." };
  }

  const departments =
    input.departmentsRaw
      ?.split(/[,;\n]/)
      .map((value) => value.trim())
      .filter(Boolean) ?? [];

  const parsed = companyProfileIngressSchema.safeParse({
    schemaVersion: COMPANY_PROFILE_SCHEMA_VERSION,
    tenantId: tenantUuid,
    companyName: input.companyName.trim(),
    sector: input.sector.trim(),
    industryAvgLossCents: tenant.ale_baseline > 0n ? tenant.ale_baseline.toString() : undefined,
    ...(departments.length > 0 ? { departments } : {}),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? "Company profile validation failed.",
    };
  }

  try {
    const result = await syncCompanyProfileFromIngress(tenantUuid, parsed.data);
    return {
      ok: true,
      companyId: result.companyId.toString(),
      created: result.created,
      departmentsSynced: result.departmentsSynced,
    };
  } catch (error) {
    console.error("[syncCompanyProfileAction]", error);
    return { ok: false, error: "Could not save the company profile. Retry in a moment." };
  }
}
