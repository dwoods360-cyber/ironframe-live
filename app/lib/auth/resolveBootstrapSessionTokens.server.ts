import "server-only";

import type { WorkspaceBootstrapTicket } from "@/app/lib/auth/workspaceBootstrapTicket";
import { exchangeSupabaseMagicLinkForSession } from "@/app/lib/server/supabaseAuthAdminHelpers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Resolve Supabase session tokens for a bootstrap ticket — inline tokens or admin magic-link exchange. */
export async function resolveBootstrapSessionTokens(
  ticket: WorkspaceBootstrapTicket,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const inlineAccess = ticket.accessToken?.trim() ?? "";
  const inlineRefresh = ticket.refreshToken?.trim() ?? "";
  if (inlineAccess && inlineRefresh) {
    return { accessToken: inlineAccess, refreshToken: inlineRefresh };
  }

  const email = ticket.userEmail?.trim().toLowerCase() ?? "";
  if (!email) return null;

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (error) {
      console.error("[resolveBootstrapSessionTokens] generateLink", error.message);
      return null;
    }

    return exchangeSupabaseMagicLinkForSession(email, data.properties ?? {});
  } catch (error) {
    console.error("[resolveBootstrapSessionTokens]", error);
    return null;
  }
}
