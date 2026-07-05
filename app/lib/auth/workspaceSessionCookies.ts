/** Client-safe workspace session cookie names and logout route (no server-only imports). */

import type { NextResponse } from "next/server";

export const IRONFRAME_TENANT_COOKIE = "ironframe-tenant";
export const IRONFRAME_SIMULATION_MODE_COOKIE = "ironframe-simulation-mode";
export const SESSION_LOGOUT_PATH = "/api/auth/session-logout";

export const WORKSPACE_SCOPE_COOKIE_NAMES = [
  IRONFRAME_TENANT_COOKIE,
  IRONFRAME_SIMULATION_MODE_COOKIE,
] as const;

export function workspaceCookieClearOptions(): {
  path: string;
  sameSite: "lax";
  secure: boolean;
  maxAge: number;
  expires: Date;
} {
  return {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    expires: new Date(0),
  };
}

/** Force-delete workspace scope cookies on a middleware or route response. */
export function stampWorkspaceCookieClears(response: NextResponse): void {
  const options = workspaceCookieClearOptions();
  for (const name of WORKSPACE_SCOPE_COOKIE_NAMES) {
    response.cookies.set(name, "", options);
    response.cookies.delete(name);
  }
}
