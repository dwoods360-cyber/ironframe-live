import "server-only";

import prisma from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  sanitizeAssigneeSelectValue,
  type AssigneeSelectOption,
} from "@/app/utils/assigneeSelectValue";

export type TenantAssigneeRosterEntry = AssigneeSelectOption & {
  userId: string;
};

type AuthProfile = {
  email: string | null;
  displayName: string;
};

async function loadSupabaseAuthProfileIndex(): Promise<Map<string, AuthProfile>> {
  const map = new Map<string, AuthProfile>();
  try {
    const supabaseAdmin = createSupabaseAdminClient();
    let page = 1;
    const perPage = 1000;

    for (;;) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) {
        throw new Error(error.message);
      }

      for (const user of data.users) {
        const email = user.email?.trim() ?? null;
        const metaName =
          typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name.trim()
            : "";
        const displayName = metaName || email || user.id;
        map.set(user.id, { email, displayName });
      }

      if (data.users.length < perPage) break;
      page += 1;
    }
  } catch (error) {
    console.warn(
      "[tenantAssigneeRoster] Supabase auth profile index unavailable:",
      error instanceof Error ? error.message : error,
    );
  }

  return map;
}

function resolveOperatorLabel(userId: string, profile: AuthProfile | undefined): string {
  if (profile?.displayName?.trim()) return profile.displayName.trim();
  if (profile?.email?.trim()) return profile.email.trim();
  return userId;
}

/** Operators with `user_role_assignments` for the tenant — excludes platform admins without membership. */
export async function fetchTenantAssigneeRoster(
  tenantUuid: string,
): Promise<TenantAssigneeRosterEntry[]> {
  const tid = tenantUuid.trim();
  if (!tid) return [];

  const assignments = await prisma.userRoleAssignment.findMany({
    where: { tenantId: tid },
    select: { userId: true },
    orderBy: { grantedAt: "asc" },
  });

  const uniqueUserIds = [...new Set(assignments.map((row) => row.userId.trim()).filter(Boolean))];
  if (uniqueUserIds.length === 0) return [];

  const profileByUserId = await loadSupabaseAuthProfileIndex();

  const roster: TenantAssigneeRosterEntry[] = [];
  const seenValues = new Set<string>();

  for (const userId of uniqueUserIds) {
    const value = sanitizeAssigneeSelectValue(userId);
    if (seenValues.has(value)) continue;
    seenValues.add(value);
    roster.push({
      userId,
      value,
      label: resolveOperatorLabel(userId, profileByUserId.get(userId)),
    });
  }

  return roster.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
}
