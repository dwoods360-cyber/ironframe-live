"use client";

import {
  IRONFRAME_SIMULATION_MODE_COOKIE,
  IRONFRAME_TENANT_COOKIE,
  SESSION_LOGOUT_PATH,
} from "@/app/lib/auth/workspaceSessionCookies";
import { resetAllStoresAndTenantScopeCache } from "@/app/utils/purgeClientTenantScope";

const WORKSPACE_SCOPE_COOKIES = [IRONFRAME_TENANT_COOKIE, IRONFRAME_SIMULATION_MODE_COOKIE] as const;

function clearWorkspaceScopeCookiesClient(): void {
  if (typeof document === "undefined") return;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  for (const name of WORKSPACE_SCOPE_COOKIES) {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax${secure}`;
  }
}

/**
 * Terminate the browser session via server logout redirect (Set-Cookie on navigation).
 * Uses `location.replace` so protected dashboard routes cannot be restored via Back.
 */
export function performClientSessionLogout(): void {
  resetAllStoresAndTenantScopeCache();
  clearWorkspaceScopeCookiesClient();
  const next = encodeURIComponent("/login");
  window.location.replace(`${SESSION_LOGOUT_PATH}?next=${next}`);
}
