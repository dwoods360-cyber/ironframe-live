import type { GrcWorkspaceRole } from "@/app/lib/grcRoles";

export type NavMaturityBadge = "STAGED DRAFT" | "PREVIEW";

export type StagedNavSurface = {
  href: string;
  badge: NavMaturityBadge;
  /** Workspace roles that cannot navigate to this stub during design-partner pilots. */
  blockRoles: readonly GrcWorkspaceRole[];
};

/** Stub routes surfaced in dashboard nav with maturity badges and pilot role guards. */
export const STAGED_NAV_SURFACES: readonly StagedNavSurface[] = [
  {
    href: "/reports/dora-eu-resilience",
    badge: "PREVIEW",
    blockRoles: ["GRC_MANAGER"],
  },
] as const;

const STAGED_BY_HREF = new Map<string, StagedNavSurface>(
  STAGED_NAV_SURFACES.map((surface) => [surface.href, surface]),
);

/** Strip optional tenant slug prefix so staged lookup works on subdomain routes. */
export function normalizeDashboardNavHref(href: string): string {
  const path = href.split("?")[0]?.split("#")[0] ?? href;
  const segments = path.split("/").filter(Boolean);
  const tenantSlugs = new Set(["medshield", "vaultbank", "gridcore", "defense", "acmecorp"]);
  if (segments.length >= 2 && tenantSlugs.has(segments[0]!)) {
    return `/${segments.slice(1).join("/")}`;
  }
  return path.startsWith("/") ? path : `/${path}`;
}

export function getStagedNavSurface(href: string): StagedNavSurface | undefined {
  return STAGED_BY_HREF.get(normalizeDashboardNavHref(href));
}

export function isStagedNavBlockedForRole(
  href: string,
  role: GrcWorkspaceRole,
): boolean {
  const surface = getStagedNavSurface(href);
  if (!surface) return false;
  return surface.blockRoles.includes(role);
}
