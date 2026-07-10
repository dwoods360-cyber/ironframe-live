import "server-only";

import prisma from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { assigneeKeyToDisplayName } from "@/app/utils/assignmentChainOfCustody";
import {
  LEGACY_HUMAN_ASSIGNEE_OPTIONS,
  sanitizeAssigneeSelectValue,
  type AssigneeSelectOption,
} from "@/app/utils/assigneeSelectValue";
import { isOpenThreatAssignee } from "@/app/utils/threatAssigneeGate";

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
  return assigneeKeyToDisplayName(userId);
}

function parseEnvAssigneeSupplement(tenantUuid: string): AssigneeSelectOption[] {
  const raw = process.env.IRONFRAME_TENANT_ASSIGNEE_SUPPLEMENT_JSON?.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Record<string, AssigneeSelectOption[]>;
    const rows = parsed[tenantUuid];
    if (!Array.isArray(rows)) return [];
    return rows
      .map((row) => ({
        value: typeof row.value === "string" ? row.value.trim() : "",
        label: typeof row.label === "string" ? row.label.trim() : "",
      }))
      .filter((row) => row.value.length > 0 && row.label.length > 0);
  } catch {
    return [];
  }
}

/** Distinct human assignee keys already used on threats for this tenant (prod + shadow). */
async function fetchHistoricalHumanAssigneeKeys(
  tenantUuid: string,
  tenantCompanyIds: bigint[],
): Promise<string[]> {
  const keys = new Set<string>();

  if (tenantCompanyIds.length > 0) {
    const prodRows = await prisma.threatEvent.findMany({
      where: {
        tenantCompanyId: { in: tenantCompanyIds },
        assigneeId: { not: null },
      },
      select: { assigneeId: true },
      distinct: ["assigneeId"],
    });
    for (const row of prodRows) {
      const key = row.assigneeId?.trim();
      if (key && !isOpenThreatAssignee(key)) keys.add(key);
    }
  }

  const simRows = await prisma.riskEvent.findMany({
    where: {
      tenantId: tenantUuid,
      assigneeId: { not: null },
    },
    select: { assigneeId: true },
    distinct: ["assigneeId"],
  });
  for (const row of simRows) {
    const key = row.assigneeId?.trim();
    if (key && !isOpenThreatAssignee(key)) keys.add(key);
  }

  return [...keys];
}

function mergeRosterEntries(
  membershipRows: TenantAssigneeRosterEntry[],
  extraKeys: Array<{ rawKey: string; label?: string; userId?: string }>,
  profileByUserId: Map<string, AuthProfile>,
): TenantAssigneeRosterEntry[] {
  const merged: TenantAssigneeRosterEntry[] = [];
  const seen = new Set<string>();

  const push = (entry: TenantAssigneeRosterEntry) => {
    const value = entry.value.trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    merged.push(entry);
  };

  for (const row of membershipRows) {
    push(row);
  }

  for (const extra of extraKeys) {
    const rawKey = extra.rawKey.trim();
    if (!rawKey || isOpenThreatAssignee(rawKey)) continue;
    const userId = (extra.userId ?? rawKey).trim();
    const value = sanitizeAssigneeSelectValue(rawKey);
    const profile = profileByUserId.get(userId) ?? profileByUserId.get(rawKey);
    const label =
      extra.label?.trim() ||
      resolveOperatorLabel(userId, profile) ||
      assigneeKeyToDisplayName(rawKey);
    push({ userId, value, label });
  }

  return merged.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
}

/** Operators with `user_role_assignments` for the tenant — excludes platform admins without membership. */
export type FetchTenantAssigneeRosterOptions = {
  /**
   * Pre-launch: platform GLOBAL_ADMIN sees every workspace operator (any tenant) plus
   * all Supabase auth identities so follow-up assignment is not tenant-scoped.
   */
  expandForPlatformAdmin?: boolean;
};

async function fetchDistinctAssignmentUserIds(tenantUuid?: string): Promise<string[]> {
  const rows = await prisma.userRoleAssignment.findMany({
    where: tenantUuid ? { tenantId: tenantUuid.trim() } : undefined,
    select: { userId: true },
    distinct: ["userId"],
    orderBy: { grantedAt: "asc" },
  });
  return [...new Set(rows.map((row) => row.userId.trim()).filter(Boolean))];
}

export async function fetchTenantAssigneeRoster(
  tenantUuid: string,
  options: FetchTenantAssigneeRosterOptions = {},
): Promise<TenantAssigneeRosterEntry[]> {
  const tid = tenantUuid.trim();
  if (!tid) return [];

  try {
    const tenantCompanyRows = await prisma.company.findMany({
      where: { tenantId: tid },
      select: { id: true },
    });
    const tenantCompanyIds = tenantCompanyRows.map((c) => c.id);

    const assignments = await prisma.userRoleAssignment.findMany({
      where: { tenantId: tid },
      select: { userId: true },
      orderBy: { grantedAt: "asc" },
    });

    const profileByUserId = await loadSupabaseAuthProfileIndex();

    const uniqueUserIds = new Set(
      assignments.map((row) => row.userId.trim()).filter(Boolean),
    );

    if (options.expandForPlatformAdmin) {
      for (const userId of await fetchDistinctAssignmentUserIds()) {
        uniqueUserIds.add(userId);
      }
      for (const userId of profileByUserId.keys()) {
        uniqueUserIds.add(userId);
      }
    }

    const membershipRoster: TenantAssigneeRosterEntry[] = [];
    const seenMembershipValues = new Set<string>();

    for (const userId of uniqueUserIds) {
      const value = sanitizeAssigneeSelectValue(userId);
      if (seenMembershipValues.has(value)) continue;
      seenMembershipValues.add(value);
      membershipRoster.push({
        userId,
        value,
        label: resolveOperatorLabel(userId, profileByUserId.get(userId)),
      });
    }

    const historicalKeys = await fetchHistoricalHumanAssigneeKeys(tid, tenantCompanyIds);
    const envSupplement = parseEnvAssigneeSupplement(tid);
    const legacySupplement = [...LEGACY_HUMAN_ASSIGNEE_OPTIONS];
    const extraKeys = [
      ...historicalKeys.map((rawKey) => ({ rawKey })),
      ...legacySupplement.map((opt) => ({ rawKey: opt.value, label: opt.label })),
      ...envSupplement.map((opt) => ({ rawKey: opt.value, label: opt.label })),
    ];

    return mergeRosterEntries(membershipRoster, extraKeys, profileByUserId);
  } catch (error) {
    console.warn(
      "[tenantAssigneeRoster] roster query failed:",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}
