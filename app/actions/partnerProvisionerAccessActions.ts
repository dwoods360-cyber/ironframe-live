"use server";

import { canUsePartnerProvisionerFromSession } from "@/app/lib/auth/partnerProvisionerAccess";

/** Client nav gate — Client Workspaces / onboarding console (fail-closed). */
export async function getPartnerProvisionerAccess(): Promise<{ canAccess: boolean }> {
  return { canAccess: await canUsePartnerProvisionerFromSession() };
}
