import { TENANT_UUIDS, type TenantKey } from "@/app/utils/tenantIsolation";

export const IRONFRAME_HOST_TENANT_SLUG_HEADER = "x-ironframe-host-tenant-slug";
export const IRONFRAME_HOST_TENANT_UUID_HEADER = "x-ironframe-host-tenant-uuid";

/** Reserved host labels — never treated as tenant subdomains. */
export const RESERVED_SUBDOMAINS = new Set([
  "www",
  "api",
  "app",
  "admin",
  "staging",
  "preview",
  "docs",
  "login",
]);

/** Top-level app routes — never interpreted as path-prefix tenants. */
export const APP_ROUTE_ROOTS = new Set([
  "integrity",
  "forgot-password",
  "reset-password",
  "unauthorized",
  "config",
  "settings",
  "profile",
  "reports",
  "vendors",
  "evidence",
  "vault",
  "audit",
  "boardroom",
  "board-report",
  "opsupport",
  "op-support",
  "cockpit",
  "register",
  "marketing",
  "pricing",
  "docs",
  "dashboard",
  "account",
  "admin",
  "get-started",
  "exports",
  "legal",
]);

const SEED_TENANT_SLUGS = new Set<string>(Object.keys(TENANT_UUIDS));

const SLUG_LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function isSubdomainTenancyEnabled(): boolean {
  return process.env.IRONFRAME_SUBDOMAIN_TENANCY?.trim() !== "0";
}

export function normalizeTenantSlugInput(raw: string): string | null {
  const slug = raw.trim().toLowerCase();
  return slug || null;
}

export function isValidTenantSlugLabel(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return SLUG_LABEL_RE.test(slug);
}

export function isReservedTenantSlugLabel(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return RESERVED_SUBDOMAINS.has(slug);
}

/** Apex domain for tenant subdomains (e.g. ironframegrc.com). */
export function resolveTenantApexDomain(): string | null {
  const explicit = process.env.IRONFRAME_TENANT_APEX_DOMAIN?.trim().toLowerCase();
  if (explicit) return explicit.replace(/^\.+/, "");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    try {
      const host = new URL(appUrl.startsWith("http") ? appUrl : `https://${appUrl}`).hostname.toLowerCase();
      if (host && host !== "localhost" && !host.endsWith(".localhost")) {
        return host;
      }
    } catch {
      /* fall through */
    }
  }

  return null;
}

/** Seed tenants only — fast sync path for middleware hot loop. */
export function isKnownTenantSlug(slug: string | null | undefined): slug is TenantKey {
  if (!slug) return false;
  return SEED_TENANT_SLUGS.has(slug.toLowerCase());
}

/** Seed tenant UUID lookup (sync). Dynamic tenants resolve via `lookupTenantBySlug`. */
export function tenantUuidFromSlug(slug: string): string | null {
  const key = slug.toLowerCase();
  if (!isKnownTenantSlug(key)) return null;
  return TENANT_UUIDS[key as TenantKey];
}

function acceptHostTenantLabel(label: string): string | null {
  const slug = label.toLowerCase();
  if (!isValidTenantSlugLabel(slug) || isReservedTenantSlugLabel(slug) || APP_ROUTE_ROOTS.has(slug)) {
    return null;
  }
  return slug;
}

/** Local wildcard dev host — `*.lvh.me` resolves to 127.0.0.1 without OS hosts file edits. */
export function resolveLocalDevTenantHostSuffix(): string {
  const override = process.env.IRONFRAME_LOCAL_TENANT_HOST?.trim().toLowerCase();
  if (override === "localhost") return "localhost";
  const devDomain = process.env.NEXT_PUBLIC_DEVELOPMENT_DOMAIN?.trim().toLowerCase();
  if (devDomain) {
    const colonIdx = devDomain.lastIndexOf(":");
    return colonIdx > 0 ? devDomain.slice(0, colonIdx) : devDomain;
  }
  return "lvh.me";
}

/** Parsed `NEXT_PUBLIC_DEVELOPMENT_DOMAIN` (e.g. `lvh.me:3000`) for local workspace URLs. */
export function resolveDevelopmentDomainHost(): { suffix: string; port: string } {
  const explicit = process.env.NEXT_PUBLIC_DEVELOPMENT_DOMAIN?.trim().toLowerCase();
  if (explicit) {
    const colonIdx = explicit.lastIndexOf(":");
    if (colonIdx > 0) {
      return {
        suffix: explicit.slice(0, colonIdx),
        port: explicit.slice(colonIdx + 1) || "3000",
      };
    }
    return { suffix: explicit, port: process.env.PORT?.trim() || "3000" };
  }
  return {
    suffix: resolveLocalDevTenantHostSuffix(),
    port: process.env.PORT?.trim() || "3000",
  };
}

/** Human-readable workspace URL for registration / onboarding previews. */
export function formatLocalTenantWorkspaceUrl(slug: string, port?: number | string): string {
  const normalized = slug.trim().toLowerCase() || "[slug]";
  const { suffix, port: defaultPort } = resolveDevelopmentDomainHost();
  const p = port != null ? String(port) : defaultPort;
  return `http://${normalized}.${suffix}:${p}`;
}

/** Post-provision login URL on the tenant workspace host. */
export function buildTenantLoginRedirectUrl(slug: string): string {
  if (process.env.NODE_ENV === "production") {
    return `${buildTenantSubdomainOrigin(slug)}/login`;
  }
  return `${formatLocalTenantWorkspaceUrl(slug)}/login`;
}

/** Existing-operator invite ingress on the tenant workspace host. */
export function buildTenantInviteLoginUrl(tenantSlug: string, inviteToken: string): string {
  const token = inviteToken.trim();
  return `${buildTenantLoginRedirectUrl(tenantSlug)}?invite=${encodeURIComponent(token)}`;
}

function labelBeforeDevSuffix(host: string, suffix: string): string | null {
  const idx = host.indexOf(`.${suffix}`);
  if (idx <= 0) return null;
  const label = host.slice(0, idx).split(":")[0]?.trim().toLowerCase();
  return label || null;
}

/**
 * Middleware-oriented tenant slug extraction with explicit dev vs production host rules.
 * Dev: `{slug}.lvh.me` (default), legacy `{slug}.localhost`, apex localhost has no slug.
 */
export function resolveTenantSlugFromRequestHost(
  host: string | null | undefined,
): string | null {
  if (!host?.trim()) return null;

  const hostLower = host.trim().toLowerCase();
  const hostname = hostLower.split(":")[0] ?? "";

  if (process.env.NODE_ENV !== "production") {
    if (hostLower.includes(".lvh.me")) {
      const label = labelBeforeDevSuffix(hostLower, "lvh.me");
      return label ? acceptHostTenantLabel(label) : null;
    }
    if (hostLower.includes(".localtest.me")) {
      const label = labelBeforeDevSuffix(hostLower, "localtest.me");
      return label ? acceptHostTenantLabel(label) : null;
    }
    if (hostname.endsWith(".localhost")) {
      const label = hostname.split(".")[0];
      return label ? acceptHostTenantLabel(label) : null;
    }
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") {
      return null;
    }
  }

  const apexDomain = resolveTenantApexDomain() || "ironframegrc.com";
  if (hostLower.includes(`.${apexDomain}`)) {
    const prefix = hostLower.split(`.${apexDomain}`)[0]?.split(":")[0]?.trim();
    if (!prefix || prefix === "www") return null;
    const slug = prefix.split(".").pop()?.toLowerCase();
    return slug ? acceptHostTenantLabel(slug) : null;
  }

  if (hostname === apexDomain || hostname === `www.${apexDomain}`) {
    return null;
  }

  return null;
}

/**
 * Extract tenant slug from Host header (any provisioned slug shape — DB validates existence).
 * Supports acmecorp.lvh.me, acmecorp.localhost, acmecorp.ironframegrc.com.
 */
export function tenantSlugFromHost(host: string | null | undefined): string | null {
  const resolved = resolveTenantSlugFromRequestHost(host);
  if (resolved) return resolved;

  if (!host?.trim() || process.env.NODE_ENV !== "production") return null;

  const hostname = host.split(":")[0]?.trim().toLowerCase() ?? "";
  const parts = hostname.split(".").filter(Boolean);
  if (parts.length >= 3) {
    return acceptHostTenantLabel(parts[0]!);
  }

  return null;
}

/** Path prefix tenant slug when it conflicts with host-bound subdomain scope. */
export function pathTenantSlugFromPathname(pathname: string): string | null {
  const seg = pathname.split("/").filter(Boolean)[0]?.toLowerCase();
  if (!seg || !isValidTenantSlugLabel(seg) || isReservedTenantSlugLabel(seg)) return null;
  if (APP_ROUTE_ROOTS.has(seg)) return null;
  return seg;
}

export function buildTenantSubdomainOrigin(slug: string, port?: number): string {
  const apex = resolveTenantApexDomain();
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  if (apex && !apex.includes("localhost") && !apex.includes("lvh.me")) {
    return `${protocol}://${slug.toLowerCase()}.${apex}`;
  }
  const resolvedPort = port ?? (Number(resolveDevelopmentDomainHost().port) || 3000);
  return formatLocalTenantWorkspaceUrl(slug, resolvedPort);
}

/** Post-login landing: Command Post on tenant subdomain, Integrity Hub on apex. */
export function resolvePostAuthLandingPath(host: string | null | undefined): "/integrity" | "/" {
  return tenantSlugFromHost(host) ? "/" : "/integrity";
}

/** True when the request host is the apex control plane (localhost, www, bare apex) — not a tenant subdomain. */
export function isApexControlPlaneHost(host: string | null | undefined): boolean {
  return !tenantSlugFromHost(host);
}
