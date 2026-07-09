"use server";

import { fetchTenantAssigneeRoster } from "@/app/lib/server/tenantAssigneeRoster.server";
import { isPlatformAdministratorIdentity } from "@/app/lib/auth/platformAdminAccess";
import { userHasTenantRoleAssignment } from "@/app/lib/security/tenantMembershipGuard";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import type { AssigneeSelectOption } from "@/app/utils/assigneeSelectValue";

export type TenantAssigneeRosterResult =
  | { ok: true; options: AssigneeSelectOption[] }
  | { ok: false; error: string; options: [] };

export async function getTenantAssigneeRosterAction(
  tenantUuid: string,
): Promise<TenantAssigneeRosterResult> {
  try {
    const tid = tenantUuid.trim();
    if (!tid) {
      return { ok: false, error: "Missing tenant scope.", options: [] };
    }

    const user = await getSupabaseSessionUser();
    if (!user?.id?.trim()) {
      return { ok: false, error: "Unauthorized.", options: [] };
    }

    const userId = user.id.trim();
    const platformAdmin = await isPlatformAdministratorIdentity(userId, user.email);
    if (!platformAdmin && !(await userHasTenantRoleAssignment(userId, tid))) {
      return { ok: false, error: "Forbidden for this workspace.", options: [] };
    }

    const roster = await fetchTenantAssigneeRoster(tid);
    return {
      ok: true,
      options: roster.map(({ value, label }) => ({ value, label })),
    };
  } catch (error) {
    console.error(
      "[getTenantAssigneeRosterAction] failed:",
      error instanceof Error ? error.message : error,
    );
    return { ok: false, error: "Assignee roster unavailable.", options: [] };
  }
}
