"use server";

import { USER_00_WORKFORCE_ID } from "@/app/config/constitutionalAuthority";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import {
  executePhoenixResurrection,
  getPhoenixUnlockRecord,
  isPhoenixResurrectionUnlocked,
  resolveRestorationReportForTenant,
  type PhoenixUnlockRecord,
} from "@/app/lib/phoenixResurrection";
import type { LastWillPlaintext } from "@/app/lib/lastWillAndTestament";

export type PhoenixResurrectionStatusDto = {
  unlocked: boolean;
  tenantId: string;
  restorationReport: LastWillPlaintext | null;
  unlockRecord: PhoenixUnlockRecord | null;
};

export async function getPhoenixResurrectionStatus(): Promise<PhoenixResurrectionStatusDto> {
  const tenantId = await getActiveTenantUuidFromCookies();
  const unlocked = isPhoenixResurrectionUnlocked(tenantId);
  const restorationReport = unlocked ? await resolveRestorationReportForTenant(tenantId) : null;
  return {
    unlocked,
    tenantId,
    restorationReport,
    unlockRecord: getPhoenixUnlockRecord(tenantId) ?? null,
  };
}

export type ExecutePhoenixResult =
  | { ok: true; constitutionalHash: string; restorationReport: LastWillPlaintext | null }
  | { ok: false; error: string };

export async function executePhoenixResurrectionAction(): Promise<ExecutePhoenixResult> {
  const user = await getSupabaseSessionUser();
  if (!user) {
    return { ok: false, error: "Authentication required." };
  }

  const tenantId = await getActiveTenantUuidFromCookies();
  const result = await executePhoenixResurrection(tenantId);
  if (!result.ok) return result;

  return {
    ok: true,
    constitutionalHash: result.constitutionalHash,
    restorationReport: result.restorationReport,
  };
}

export async function requireUser00ForRestorationReport(): Promise<boolean> {
  const user = await getSupabaseSessionUser();
  if (!user) return false;
  const id = (user.email ?? user.id ?? "").trim();
  return id === USER_00_WORKFORCE_ID || id.toLowerCase() === "user_00";
}
