"use server";

import { canUsePlatformAdminTools } from "@/app/lib/auth/platformAdminAccess";

/** Client nav gate — deferred off HeaderTwo critical path (fail-closed). */
export async function getPlatformAdminToolsAccess(): Promise<{ canAccess: boolean }> {
  return { canAccess: await canUsePlatformAdminTools() };
}
