"use server";

import { getSupabaseSessionUser } from "@/app/utils/serverAuth";

/**
 * Resolves the signed-in Supabase user for pipeline Acknowledge attribution (replaces static `admin-user-01`).
 */
export async function getSupabaseOperatorIdForAcknowledge(): Promise<string> {
  const user = await getSupabaseSessionUser();
  if (!user) {
    return "admin-user-01";
  }
  const id = typeof user.id === "string" ? user.id.trim() : "";
  if (id.length > 0) {
    return id;
  }
  const email = user.email?.trim();
  if (email) {
    return email;
  }
  return "admin-user-01";
}
