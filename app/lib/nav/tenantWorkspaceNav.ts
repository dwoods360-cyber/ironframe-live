import type { LinkProps } from "next/link";

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

/** True when the active host is a dedicated tenant workspace (not apex marketing/control plane). */
export function isTenantWorkspaceHost(
  browserHost: string | null | undefined,
  hostTenantSlug: string | null | undefined,
): boolean {
  if (browserHost) return !isApexControlPlaneHost(browserHost);
  return Boolean(hostTenantSlug?.trim());
}

/**
 * Full document navigation on tenant hosts — avoids Next.js soft-route stalls from
 * standalone `/reports/*` surfaces (audit trail, quick reports, etc.).
 */
export function assignTenantWorkspaceNav(
  href: LinkProps["href"],
  browserHost: string | null | undefined,
  hostTenantSlug: string | null | undefined,
): boolean {
  if (!isTenantWorkspaceHost(browserHost, hostTenantSlug)) return false;
  window.location.assign(resolveLinkHref(href));
  return true;
}
