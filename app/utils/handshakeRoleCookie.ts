"use client";

import type { ShadowHandshakeRole } from "@/app/store/shadowHandshakeRoleStore";

const COOKIE = "ironframe-handshake-role";
const MAX_AGE_S = 8 * 60 * 60;

/** Non-httpOnly so `document.cookie` can set it; server reads via `cookies()` for `generateCisoApproval`. */
export function syncHandshakeRoleCookie(role: ShadowHandshakeRole): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE}=${encodeURIComponent(role)}; Path=/; Max-Age=${MAX_AGE_S}; SameSite=Lax`;
}
