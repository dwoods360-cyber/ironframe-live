import { buildTenantSubdomainOrigin, isApexControlPlaneHost } from "@/app/lib/tenantSubdomain";

type TenantScopeRow = {
  id: string;
  slug: string;
  name?: string;
};

export type CommandPostWorkspaceTarget = {
  href: string;
  usesWorkspaceOrigin: boolean;
  workspaceSlug: string | null;
};

/** Resolve Command Post navigation target for header links. */
export function resolveCommandPostWorkspaceTarget(
  hostTenantSlug: string | null | undefined,
  tenants: readonly TenantScopeRow[],
  cookieRaw: string | null | undefined,
  canAccessGlobal = false,
): CommandPostWorkspaceTarget {
  if (hostTenantSlug) {
    return { href: "/", usesWorkspaceOrigin: false, workspaceSlug: null };
  }

  const raw = cookieRaw?.trim().toLowerCase() ?? "";
  const match =
    tenants.find((tenant) => tenant.id.toLowerCase() === raw) ??
    tenants.find((tenant) => tenant.slug.toLowerCase() === raw) ??
    (!raw && !canAccessGlobal ? tenants[0] : undefined);

  if (match?.slug) {
    return {
      href: buildTenantSubdomainOrigin(match.slug),
      usesWorkspaceOrigin: true,
      workspaceSlug: match.slug,
    };
  }

  return { href: "#", usesWorkspaceOrigin: false, workspaceSlug: null };
}

/**
 * Apex Command Post — prefer RBAC/cookie scope, then primary assignment slug, then first scoped tenant.
 * Command Post never intentionally targets `/integrity`; that route is Integrity Hub only.
 */
export function resolveApexCommandPostWorkspaceTarget(
  tenants: readonly TenantScopeRow[],
  cookieRaw: string | null | undefined,
  landingSlug: string | null | undefined,
  canAccessGlobal = false,
): CommandPostWorkspaceTarget {
  const scoped = resolveCommandPostWorkspaceTarget(null, tenants, cookieRaw, canAccessGlobal);
  if (scoped.usesWorkspaceOrigin) return scoped;

  const slug =
    landingSlug?.trim().toLowerCase() ||
    tenants[0]?.slug?.trim().toLowerCase() ||
    null;
  if (!slug) return scoped;

  return {
    href: buildTenantSubdomainOrigin(slug),
    usesWorkspaceOrigin: true,
    workspaceSlug: slug,
  };
}

export function isCommandPostNavigationReady(
  target: CommandPostWorkspaceTarget,
  host: string | null | undefined = null,
): boolean {
  if (target.usesWorkspaceOrigin && target.workspaceSlug) return true;
  if (isApexControlPlaneHost(host)) return false;
  return target.href === "/" && !target.usesWorkspaceOrigin;
}

/** Bootstrap redeem URLs must land on the tenant workspace host — never the apex control plane. */
export function isTenantWorkspaceBootstrapUrl(
  bootstrapUrl: string,
  expectedTenantSlug: string,
): boolean {
  try {
    const url = new URL(bootstrapUrl);
    const host = url.hostname.toLowerCase();
    const slug = expectedTenantSlug.trim().toLowerCase();
    if (!slug) return false;
    if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return false;
    if (host === slug) return false;
    return (
      host === `${slug}.lvh.me` ||
      host === `${slug}.localhost` ||
      host.startsWith(`${slug}.`)
    );
  } catch {
    return false;
  }
}
