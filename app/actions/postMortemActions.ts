"use server";

import { unstable_noStore as noStore } from "next/cache";
import { getPostMortemSummary, type PostMortemSummary } from "@/app/lib/postMortemEngine";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

export type { PostMortemSummary };

/**
 * Forensic post-mortem for the current tenant session (cookie scope).
 */
export async function getPostMortemSummaryAction(
  lookbackHours?: number,
): Promise<{ ok: true; summary: PostMortemSummary } | { ok: false; error: string }> {
  noStore();
  const tenantUuid = await getActiveTenantUuidFromCookies();
  if (!tenantUuid?.trim()) {
    return { ok: false, error: "No active tenant (ironframe-tenant)." };
  }
  const hours =
    typeof lookbackHours === "number" && Number.isFinite(lookbackHours) && lookbackHours > 0 && lookbackHours <= 168
      ? Math.floor(lookbackHours)
      : 24;
  const summary = await getPostMortemSummary(tenantUuid.trim(), hours);
  return { ok: true, summary };
}
