import {
  buildTenantSubdomainOrigin,
  resolvePostAuthLandingPath,
  tenantSlugFromHost,
} from "@/app/lib/tenantSubdomain";

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

/** Dev port for tenant subdomain links — prefers NEXT_PUBLIC_APP_URL over PORT. */
export function resolveLocalDevAppPort(): number {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    try {
      const parsed = new URL(explicit.startsWith("http") ? explicit : `http://${explicit}`);
      if (parsed.port) return Number(parsed.port) || 3000;
      return parsed.protocol === "https:" ? 443 : 80;
    } catch {
      // fall through
    }
  }
  return Number(process.env.PORT?.trim() || "3000") || 3000;
}

export function isPasswordRecoveryNextPath(nextPath: string): boolean {
  return nextPath.trim() === "/reset-password";
}

export function resolveSupabasePasswordResetRedirectOrigin(): string {
  return resolvePublicAppUrl();
}

/** Supabase invite redirect — always tenant workspace host (never apex localhost). */
export function resolveSupabaseInviteRedirectOrigin(tenantSlug: string): string {
  return resolveTenantAuthRedirectOrigin(tenantSlug);
}

/** Safe internal redirect path — blocks open redirects. */
export function sanitizeAuthNextPath(raw: string | null | undefined, fallback = "/integrity"): string {
  const next = (raw ?? "").trim();
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  if (next.includes("://")) return fallback;
  return next;
}

export function buildPasswordResetRedirectUrl(origin: string): string {
  return buildAuthCallbackUrl(origin, "/reset-password");
}

/** Tenant workspace origin for B2B invites and deep links (`vaultbank.lvh.me:3000`, `vaultbank.ironframegrc.com`). */
export function resolveTenantAuthRedirectOrigin(tenantSlug: string): string {
  return buildTenantSubdomainOrigin(tenantSlug, resolveLocalDevAppPort());
}

export function buildAuthCallbackUrl(
  origin: string,
  nextPath: string,
  options?: { workspaceTenantSlug?: string },
): string {
  const safeNext = sanitizeAuthNextPath(nextPath, "/integrity");
  const url = new URL("/api/auth/callback", sanitizePublicOrigin(origin));
  url.searchParams.set("next", safeNext);
  const tenantSlug = options?.workspaceTenantSlug?.trim().toLowerCase();
  if (tenantSlug) {
    url.searchParams.set("tenant", tenantSlug);
  }
  return url.toString();
}

/** Host-aware post-auth path — remaps apex `/integrity` invites to `/` on tenant subdomains. */
export function resolveAuthNextPathForHost(
  host: string | null | undefined,
  rawNext: string | null | undefined,
): string {
  const defaultLanding = resolvePostAuthLandingPath(host ?? null);
  const next = sanitizeAuthNextPath(rawNext, defaultLanding);
  if (tenantSlugFromHost(host) && next === "/integrity") {
    return "/";
  }
  return next;
}
