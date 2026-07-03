"use server";

import prisma from "@/lib/prisma";
import { parseDollarAleToBigIntCents } from "@/app/lib/server/salesIntakeParse";
import {
  ensureDashboardTenantSession,
  resolveDashboardAccess,
} from "@/app/lib/auth/dashboardRoleAccess";
import { getScopedTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

export type UpdateWorkspaceAleBaselineResult =
  | { ok: true; aleBaselineCents: string }
  | { ok: false; error: string };

export async function updateWorkspaceAleBaselineAction(
  aleBaselineDollars: string,
): Promise<UpdateWorkspaceAleBaselineResult> {
  const access = await ensureDashboardTenantSession(await resolveDashboardAccess());
  if (access.status !== "allowed") {
    return { ok: false, error: "Sign in to configure the workspace ALE baseline." };
  }

  const parsed = parseDollarAleToBigIntCents(aleBaselineDollars);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
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

  try {
    await prisma.tenant.update({
      where: { id: tenantUuid },
      data: { ale_baseline: parsed.cents },
    });
  } catch (error) {
    console.error("[updateWorkspaceAleBaseline] tenant update failed", error);
    return {
      ok: false,
      error: "Could not save the ALE baseline. Retry in a moment.",
    };
  }

  return { ok: true, aleBaselineCents: parsed.cents.toString() };
}
