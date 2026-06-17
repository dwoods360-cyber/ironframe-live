import "server-only";

import { headers } from "next/headers";
import { resolvePublicAppUrl, sanitizePublicOrigin } from "@/app/lib/auth/publicAppUrl";

/**
 * Prefer the active request host (localhost, Vercel preview, production) for auth redirects.
 * Falls back to `resolvePublicAppUrl()` when headers are unavailable.
 */
export async function resolveAuthRedirectOrigin(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host")?.split(",")[0]?.trim() || h.get("host")?.trim();
    if (host) {
      const proto =
        h.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
        (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
      return sanitizePublicOrigin(`${proto}://${host}`);
    }
  } catch {
    // Outside a request (tests/scripts).
  }
  return resolvePublicAppUrl();
}
