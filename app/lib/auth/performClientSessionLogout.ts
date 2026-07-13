"use client";

import {
  IRONFRAME_SIMULATION_MODE_COOKIE,
  IRONFRAME_TENANT_COOKIE,
  SESSION_LOGOUT_PATH,
} from "@/app/lib/auth/workspaceSessionCookies";

export const LOGOUT_IN_FLIGHT_SESSION_KEY = "ironframe-logout-in-flight";

const WORKSPACE_SCOPE_COOKIES = [IRONFRAME_TENANT_COOKIE, IRONFRAME_SIMULATION_MODE_COOKIE] as const;

function clearWorkspaceScopeCookiesClient(): void {
  if (typeof document === "undefined") return;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  for (const name of WORKSPACE_SCOPE_COOKIES) {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax${secure}`;
  }
}

function markLogoutInFlight(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(LOGOUT_IN_FLIGHT_SESSION_KEY, "1");
  } catch {
    /* private mode */
  }
}

/**
 * Terminate the browser session via server logout redirect (Set-Cookie on navigation).
 * Uses `location.replace` so protected dashboard routes cannot be restored via Back.
 * Store purge is deferred to `/login` mount — wiping Zustand before navigation caused
 * Integrity Hub `router.refresh()` races that rendered a blank unstyled shell.
 */
export function performClientSessionLogout(): void {
  markLogoutInFlight();
  clearWorkspaceScopeCookiesClient();
  const next = encodeURIComponent("/login");
  window.location.replace(`${SESSION_LOGOUT_PATH}?next=${next}`);
}
