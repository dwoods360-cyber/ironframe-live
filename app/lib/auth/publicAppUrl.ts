/**
 * Canonical browser origin for Supabase Auth redirect URLs (reset, invite, callback).
 */
export function resolvePublicAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}

/** Safe internal redirect path — blocks open redirects. */
export function sanitizeAuthNextPath(raw: string | null | undefined, fallback = "/integrity"): string {
  const next = (raw ?? "").trim();
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  if (next.includes("://")) return fallback;
  return next;
}
