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

/** Guest-readable marketing surfaces (no session required). Product docs and pricing require login. */
export function isPublicRoute(pathname: string): boolean {
  if (pathname === "/marketing" || pathname.startsWith("/marketing/")) return true;
  return false;
}

/** Signed perimeter ingress for Ironleads → SUSPECT CRM queue (Bearer IRONLEADS_INGRESS_SECRET). */
export const IRONLEADS_INGRESS_PATH = "/api/v1/ingress/ironleads" as const;

export function isIronleadsIngressPath(pathname: string): boolean {
  return pathname === IRONLEADS_INGRESS_PATH;
}

/** Signed perimeter ingress for SalesTeam poll worker (Bearer SALESTEAM_INGRESS_SECRET). */
export const SALESTEAM_PROSPECTS_INGRESS_PATH = "/api/v1/ingress/salesteam/prospects" as const;
export const SALESTEAM_OUTREACH_INGRESS_PATH = "/api/v1/ingress/salesteam/outreach" as const;

export function isSalesteamProspectsIngressPath(pathname: string): boolean {
  return pathname === SALESTEAM_PROSPECTS_INGRESS_PATH;
}

export function isSalesteamOutreachIngressPath(pathname: string): boolean {
  return pathname === SALESTEAM_OUTREACH_INGRESS_PATH;
}

export function isSalesteamIngressPath(pathname: string): boolean {
  return isSalesteamProspectsIngressPath(pathname) || isSalesteamOutreachIngressPath(pathname);
}

/** Signed perimeter ingress for IronSuccessTeam poll worker (Bearer SUCCESS_TEAM_INGRESS_SECRET). */
export const SUCCESS_TEAM_ACCOUNTS_INGRESS_PATH = "/api/v1/ingress/success-team/accounts" as const;
export const SUCCESS_TEAM_HEALTH_SNAPSHOT_INGRESS_PATH =
  "/api/v1/ingress/success-team/health-snapshot" as const;
export const SUCCESS_TEAM_ADVISORY_INGRESS_PATH = "/api/v1/ingress/success-team/advisory" as const;

export function isSuccessTeamAccountsIngressPath(pathname: string): boolean {
  return pathname === SUCCESS_TEAM_ACCOUNTS_INGRESS_PATH;
}

export function isSuccessTeamHealthSnapshotIngressPath(pathname: string): boolean {
  return pathname === SUCCESS_TEAM_HEALTH_SNAPSHOT_INGRESS_PATH;
}

export function isSuccessTeamAdvisoryIngressPath(pathname: string): boolean {
  return pathname === SUCCESS_TEAM_ADVISORY_INGRESS_PATH;
}

export function isSuccessTeamIngressPath(pathname: string): boolean {
  return (
    isSuccessTeamAccountsIngressPath(pathname) ||
    isSuccessTeamHealthSnapshotIngressPath(pathname) ||
    isSuccessTeamAdvisoryIngressPath(pathname)
  );
}

/** Infra liveness probe — no session or tenant context required. */
export function isInfraHealthPath(pathname: string): boolean {
  return pathname === "/api/health";
}

/** Product documentation, pricing, and strategic briefings — authenticated operators only. */
export function isAuthenticatedProductSurfacePath(pathname: string): boolean {
  if (pathname === "/docs" || pathname.startsWith("/docs/")) return true;
  if (pathname === "/pricing" || pathname.startsWith("/pricing/")) return true;
  if (pathname === "/governance-frame" || pathname.startsWith("/governance-frame/")) return true;
  if (pathname === "/api/docs/download-protocol") return true;
  if (pathname === "/api/docs/download-matrix") return true;
  if (pathname.startsWith("/api/docs/hub-asset/")) return true;
  return false;
}

/**
 * Public surfaces allowed through deployment quarantine on non-local hosts
 * when `IRONFRAME_ALLOW_PUBLIC_INGRESS` is unset (narrow staging baseline).
 * Private workspace routes (`/integrity`, `/dashboard`, tenant enclaves, etc.) stay blocked.
 */
export function isPublicCloudIngressPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") return true;
  if (isPublicRoute(pathname)) return true;
  if (pathname.startsWith("/api/auth/callback")) return true;
  if (isAuthPublicPath(pathname)) return true;
  if (isPublicProspectOnboardingPath(pathname)) return true;
  if (pathname === "/legal/accept" || pathname.startsWith("/legal/accept/")) return true;
  if (pathname === "/account/billing-hold" || pathname.startsWith("/account/billing-hold/")) {
    return true;
  }
  return false;
}

/**
 * Ironframe tenant workspace / command-center UI — always renders Cyber Command Dark.
 * Guest marketing, auth, and prospect funnel routes are excluded.
 */
export function isIronframeSaaSAppPath(
  pathname: string,
  options?: { authenticated?: boolean; hostTenantSlug?: string | null },
): boolean {
  const normalized = pathname.replace(/\/$/, "") || "/";
  if (isPrivateWorkspaceIngressPath(normalized)) return true;

  const authenticated = options?.authenticated === true;
  if (authenticated && (normalized === "/" || normalized.startsWith("/docs"))) {
    return true;
  }

  const hostTenantSlug = options?.hostTenantSlug?.trim();
  if (hostTenantSlug && normalized === "/") {
    return true;
  }

  return false;
}

/** True when a path is a tenant workspace / command-center surface (not public funnel). */
export function isPrivateWorkspaceIngressPath(pathname: string): boolean {
  if (isPublicCloudIngressPath(pathname)) return false;
  if (pathname.startsWith("/api/internal/cron/")) return false;
  if (pathname === "/api/cron/narrate") return false;
  if (pathname === "/api/board/feed") return false;
  if (pathname.startsWith("/api/internal/ironquery/export")) return false;
  if (pathname === "/api/webhooks/stripe" || pathname === "/api/billing/webhook") return false;
  if (isIronleadsIngressPath(pathname)) return false;
  if (isSalesteamIngressPath(pathname)) return false;
  if (isSuccessTeamIngressPath(pathname)) return false;
  if (isInfraHealthPath(pathname)) return false;
  if (isPublicConstitutionalSentinelPath(pathname)) return false;
  return true;
}

/** Prospect funnel pages + lead intake APIs — allow without Supabase session. */
export function isPublicProspectOnboardingPath(pathname: string): boolean {
  if (
    pathname === "/marketing" ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname === "/sales-agent-portal"
  ) {
    return true;
  }
  if (
    pathname === "/api/register/public-lead" ||
    pathname === "/api/register/public-intake" ||
    pathname === "/api/agents/sales"
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
    "/get-started",
    "/exports",
    "/trust",
    "/dashboard/support",
    "/dashboard/admin",
    "/dashboard/operations",
    "/boardroom",
  ] as const;
  return bases.some((base) => pathname === base || pathname.startsWith(`${base}/`));
}

/** Tripane home and cockpit — bounded viewport; column or grid scroll, not AppShell body. */
export function isViewportBoundedDashboardPath(pathname: string): boolean {
  return pathname === "/" || pathname === "/cockpit";
}

/** Full-page routes that scroll in AppShell (not tripane column scroll). */
export function isScrollableStandalonePath(pathname: string): boolean {
  return !isViewportBoundedDashboardPath(pathname);
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
    pathname === "/integrity" ||
    pathname.startsWith("/integrity/") ||
    pathname === "/docs" ||
    pathname.startsWith("/docs/") ||
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
