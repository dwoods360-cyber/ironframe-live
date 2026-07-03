"use client";

import { createClient } from "@/lib/supabase/client";
import { resetAllStoresAndTenantScopeCache } from "@/app/utils/purgeClientTenantScope";

const IRONFRAME_TENANT_COOKIE = "ironframe-tenant";
/** Bound local sign-out — never block redirect longer than this on slow networks. */
const LOGOUT_LOCAL_SIGNOUT_BUDGET_MS = 300;

function clearIronframeTenantCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${IRONFRAME_TENANT_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

/**
 * Terminate the browser session and hard-navigate to `/login` on the current host.
 * Uses `location.replace` so protected dashboard routes cannot be restored via Back.
 */
export async function performClientSessionLogout(): Promise<void> {
  resetAllStoresAndTenantScopeCache();
  clearIronframeTenantCookie();

  const supabase = createClient();
  await Promise.race([
    supabase.auth.signOut({ scope: "local" }),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, LOGOUT_LOCAL_SIGNOUT_BUDGET_MS);
    }),
  ]);

  window.location.replace("/login");
}
