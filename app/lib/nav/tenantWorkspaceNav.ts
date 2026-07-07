import type { LinkProps } from "next/link";

import { isHeavySoftNavSourcePath } from "@/app/utils/grcRouteMatch";
import { isApexControlPlaneHost } from "@/app/lib/tenantSubdomain";

export function resolveLinkHref(href: LinkProps["href"]): string {
  if (typeof href === "string") return href;
  const pathname = href.pathname ?? "/";
  const search =
    typeof href.search === "string"
      ? href.search
      : href.query && typeof href.query === "object"
        ? `?${new URLSearchParams(href.query as Record<string, string>).toString()}`
        : "";
  const hash = href.hash ?? "";
  return `${pathname}${search}${hash}`;
}

function normalizePathname(path: string): string {
  const bare = path.split("?")[0]?.split("#")[0] ?? path;
  return bare.startsWith("/") ? bare : `/${bare}`;
}

/** True when the active host is a dedicated tenant workspace (not apex marketing/control plane). */
export function isTenantWorkspaceHost(
  browserHost: string | null | undefined,
  hostTenantSlug: string | null | undefined,
): boolean {
  if (browserHost) return !isApexControlPlaneHost(browserHost);
  return Boolean(hostTenantSlug?.trim());
}

/**
 * Full document navigation — avoids Next.js soft-route stalls from heavy standalone
 * surfaces (`/integrity`, `/reports/*`) and on tenant workspace hosts.
 */
export function assignTenantWorkspaceNav(
  href: LinkProps["href"],
  browserHost: string | null | undefined,
  hostTenantSlug: string | null | undefined,
  currentPathname?: string | null,
): boolean {
  const target = resolveLinkHref(href);
  const sourcePath = currentPathname ? normalizePathname(currentPathname) : null;
  const targetPath = normalizePathname(target);

  if (sourcePath && isHeavySoftNavSourcePath(sourcePath) && targetPath !== sourcePath) {
    window.location.assign(target);
    return true;
  }

  if (!isTenantWorkspaceHost(browserHost, hostTenantSlug)) return false;
  window.location.assign(target);
  return true;
}
