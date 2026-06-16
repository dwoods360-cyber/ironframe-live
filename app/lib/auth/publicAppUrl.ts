import { headers } from "next/headers";

/** Strip accidental markdown link syntax from env vars (breaks Supabase /verify). */
export function sanitizePublicOrigin(raw: string): string {
  const trimmed = raw.trim();
  const markdown = trimmed.match(/^\[([^\]]*)\]\(([^)]+)\)$/);
  if (markdown) return markdown[2].trim().replace(/\/+$/, "");
  return trimmed.replace(/\/+$/, "");
}

/**
 * Canonical browser origin for Supabase Auth redirect URLs (reset, invite, callback).
 * Set `NEXT_PUBLIC_APP_URL=https://ironframegrc.com` in production (see `.env.example`).
 */
export function resolvePublicAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return sanitizePublicOrigin(explicit);

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return sanitizePublicOrigin(`https://${vercel}`);

  return "http://localhost:3000";
}

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

/** Safe internal redirect path — blocks open redirects. */
export function sanitizeAuthNextPath(raw: string | null | undefined, fallback = "/integrity"): string {
  const next = (raw ?? "").trim();
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  if (next.includes("://")) return fallback;
  return next;
}

export function buildPasswordResetRedirectUrl(origin: string): string {
  return `${sanitizePublicOrigin(origin)}/api/auth/callback?next=/reset-password`;
}
