/**
 * Global GRC routes live outside tenant enclaves (`/medshield`, etc.).
 * Tenant-prefixed checks from c160ce4 must not break these paths.
 */

import {
  isReservedTenantSlugLabel,
  isValidTenantSlugLabel,
} from "@/app/lib/tenantSubdomain";

const LEGACY_PATH_TENANT_SLUGS = ["medshield", "vaultbank", "gridcore", "defense"] as const;

function normalizeHostTenantSlug(hostTenantSlug: string | null): string | null {
  if (!hostTenantSlug) return null;
  const slug = hostTenantSlug.toLowerCase();
  if (!isValidTenantSlugLabel(slug) || isReservedTenantSlugLabel(slug)) return null;
  return slug;
}

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
export function buildHeaderRouteMatrix(
  pathname: string,
  hostTenantSlug: string | null = null,
): HeaderRouteMatrix {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0]?.toLowerCase() ?? "";
  const pathTenant = LEGACY_PATH_TENANT_SLUGS.includes(first as (typeof LEGACY_PATH_TENANT_SLUGS)[number])
    ? first
    : null;
  const normalizedHostSlug = normalizeHostTenantSlug(hostTenantSlug);
  const currentTenant = pathTenant ?? normalizedHostSlug;
  const prefix = pathTenant ? `/${pathTenant}` : "";

  const isGlobalConfigRoute =
    pathname === "/config" ||
    pathname.startsWith("/config/") ||
    pathname === "/settings/config" ||
    pathname.startsWith("/settings/config/");

  const playbookRouteMatch = pathname.match(/^\/(medshield|vaultbank|gridcore|defense)\/playbooks(\/|$)/);
  const playbookEntity = playbookRouteMatch?.[1]?.toUpperCase()
    ?? (normalizedHostSlug && /^\/playbooks(\/|$)/.test(pathname)
      ? normalizedHostSlug.toUpperCase()
      : null);

  return {
    currentTenant,
    prefix,
    homeLink: "/",
    isVendorsRoute:
      pathname === "/vendors" ||
      pathname.startsWith("/vendors/") ||
      pathname === `${prefix}/vendors` ||
      pathname.startsWith(`${prefix}/vendors/`),
    isConfigRoute:
      isGlobalConfigRoute ||
      pathname === `${prefix}/config` ||
      pathname.startsWith(`${prefix}/config/`),
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

/** Prospect funnel pages + lead intake APIs — allow without Supabase session. */
export function isPublicProspectOnboardingPath(pathname: string): boolean {
  if (
    pathname === "/marketing" ||
    pathname === "/pricing" ||
    pathname === "/terms" ||
    pathname === "/privacy"
  ) {
    return true;
  }
  if (
    pathname === "/api/register/public-lead" ||
    pathname === "/api/register/public-intake"
  ) {
    return true;
  }
  return (
    pathname === "/register/contact" ||
    pathname === "/register/setup" ||
    pathname === "/register/demo" ||
    pathname.startsWith("/register/")
  );
}

/** Auth surfaces that must not mount workspace chrome (TopNav, tenant switcher, telemetry). */
export function isAuthPublicPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/unauthorized"
  );
}

/** Isolated prospect sandbox — mirrors dashboard chrome without auth gate. */
export function isDemoRouteGroupPath(pathname: string): boolean {
  return pathname === "/demo" || pathname.startsWith("/demo/");
}

/** Routes under `app/(dashboard)/` — command center shell lives in that layout group. */
export function isDashboardRouteGroupPath(pathname: string): boolean {
  if (isDemoRouteGroupPath(pathname)) return true;
  const bases = [
    "/integrity",
    "/profile",
    "/cockpit",
    "/op-support",
    "/opsupport",
    "/evidence",
    "/board-report",
    "/audit",
    "/admin/governance/comparison",
    "/admin/clearance/vault",
    "/admin/onboarding",
  ] as const;
  return bases.some((base) => pathname === base || pathname.startsWith(`${base}/`));
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

/** Read-only constitutional sentinel + Irontech recovery — must work without a dashboard session (marketing shell polls these). */
export function isPublicConstitutionalSentinelPath(pathname: string): boolean {
  return (
    pathname === "/api/grc/tas-integrity" ||
    pathname === "/api/grc/tas-fingerprint" ||
    pathname === "/api/grc/security-posture" ||
    pathname === "/api/grc/constitutional-restoration"
  );
}

/** Prospect onboarding + auth entry — never mount Ironlock constitutional void overlay. */
export function isConstitutionalOverlaySuppressedPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/marketing" ||
    pathname === "/login" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/register/setup" ||
    pathname === "/register/demo" ||
    pathname === "/register/contact" ||
    pathname.startsWith("/register/") ||
    isDemoRouteGroupPath(pathname)
  );
}
