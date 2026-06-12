/**
 * Global GRC routes live outside tenant enclaves (`/medshield`, etc.).
 * Tenant-prefixed checks from c160ce4 must not break these paths.
 */

export function isReportsPath(pathname: string): boolean {
  return pathname === "/reports" || pathname.startsWith("/reports/");
}

/** Tenant-prefixed or global path under `/reports`. */
export function isReportsPathWithTenant(pathname: string, tenantPrefix = ""): boolean {
  const base = tenantPrefix ? `${tenantPrefix}/reports` : "/reports";
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function isReportsAuditTrailPath(pathname: string): boolean {
  return pathname === "/reports/audit-trail" || pathname.startsWith("/reports/audit-trail/");
}

/** Global or tenant-prefixed audit trail (e.g. `/medshield/reports/audit-trail`). */
export function isReportsAuditTrailPathWithTenant(pathname: string, tenantPrefix = ""): boolean {
  if (isReportsAuditTrailPath(pathname)) return true;
  if (!tenantPrefix) return false;
  const base = `${tenantPrefix}/reports/audit-trail`;
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function isLegacyAuditTrailRedirectPath(pathname: string): boolean {
  return pathname === "/audit-trail" || pathname.startsWith("/audit-trail/");
}

const HEADER_TENANT_SLUGS = ["medshield", "vaultbank", "gridcore", "defense"] as const;

export type HeaderRouteMatrix = {
  currentTenant: string | null;
  prefix: string;
  homeLink: string;
  isVendorsRoute: boolean;
  isConfigRoute: boolean;
  isAuditTrailRoute: boolean;
  isEvidenceRoute: boolean;
  isFrameworksRoute: boolean;
  isIntegrityHubRoute: boolean;
  isBoardReportRoute: boolean;
  isOpSupportRoute: boolean;
  playbookEntity: string | null;
  isPlaybookRoute: boolean;
};

/** Memo-friendly Header #1/#2 route flags — single pass per pathname change. */
export function buildHeaderRouteMatrix(pathname: string): HeaderRouteMatrix {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0]?.toLowerCase() ?? "";
  const currentTenant = HEADER_TENANT_SLUGS.includes(first as (typeof HEADER_TENANT_SLUGS)[number])
    ? first
    : null;
  const prefix = currentTenant ? `/${currentTenant}` : "";

  const playbookRouteMatch = pathname.match(/^\/(medshield|vaultbank|gridcore|defense)\/playbooks(\/|$)/);
  const playbookEntity = playbookRouteMatch?.[1]?.toUpperCase() ?? null;

  return {
    currentTenant,
    prefix,
    homeLink: prefix || "/",
    isVendorsRoute: pathname === `${prefix}/vendors` || pathname.startsWith(`${prefix}/vendors/`),
    isConfigRoute: pathname === `${prefix}/config` || pathname.startsWith(`${prefix}/config/`),
    isAuditTrailRoute: isReportsAuditTrailPathWithTenant(pathname, prefix),
    isEvidenceRoute:
      pathname === "/evidence" ||
      pathname.startsWith("/evidence/") ||
      pathname === "/vault" ||
      pathname.startsWith("/vault/") ||
      pathname === `${prefix}/evidence` ||
      pathname.startsWith(`${prefix}/evidence/`),
    isFrameworksRoute:
      pathname === `${prefix}/compliance/frameworks` ||
      pathname.startsWith(`${prefix}/compliance/frameworks/`),
    isIntegrityHubRoute: pathname === "/integrity" || pathname.startsWith("/integrity/"),
    isBoardReportRoute: pathname === "/board-report" || pathname.startsWith("/board-report/"),
    isOpSupportRoute:
      pathname === "/opsupport" ||
      pathname.startsWith("/opsupport/") ||
      pathname === "/op-support" ||
      pathname.startsWith("/op-support/"),
    playbookEntity,
    isPlaybookRoute: Boolean(playbookEntity),
  };
}

/** Full-page routes that scroll in AppShell (not tripane column scroll). */
export function isScrollableStandalonePath(pathname: string): boolean {
  return (
    pathname === "/docs" ||
    pathname.startsWith("/docs/") ||
    pathname === "/board-report" ||
    pathname.startsWith("/board-report/") ||
    isReportsPath(pathname) ||
    pathname === "/integrity" ||
    pathname.startsWith("/integrity/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/config" ||
    pathname.startsWith("/config/") ||
    pathname === "/opsupport" ||
    pathname.startsWith("/opsupport/") ||
    pathname === "/op-support" ||
    pathname.startsWith("/op-support/") ||
    pathname === "/audit" ||
    pathname.startsWith("/audit/") ||
    pathname === "/vault" ||
    pathname.startsWith("/vault/") ||
    pathname === "/evidence" ||
    pathname.startsWith("/evidence/")
  );
}
