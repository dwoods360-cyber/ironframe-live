import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { findSupabaseAuthUserByEmail } from "@/app/lib/server/supabaseAuthAdminHelpers";

/** Whether the browser must be moved to the tenant workspace host before invite activation. */
export function shouldRedirectInviteToTenantHost(
  hostSlug: string | null | undefined,
  expectedTenantSlug: string | null | undefined,
): boolean {
  const expected = expectedTenantSlug?.trim().toLowerCase();
  if (!expected) return false;
  return (hostSlug?.trim().toLowerCase() ?? null) !== expected;
}

/** Whether the invited operator already has a Supabase auth.users row (password sign-in path). */
export async function operatorSupabaseAccountExists(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const user = await findSupabaseAuthUserByEmail(supabaseAdmin, normalized);
    return Boolean(user?.id?.trim());
  } catch (error) {
    console.error("[workspaceInviteIngressRouting] operatorSupabaseAccountExists failed", error);
    return false;
  }
}