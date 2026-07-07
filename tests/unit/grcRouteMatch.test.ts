import { describe, expect, it } from "vitest";
import {
  buildHeaderRouteMatrix,
  isAuthenticatedProductSurfacePath,
  isDashboardRouteGroupPath,
  isIronframeSaaSAppPath,
  isLegacyAuditTrailRedirectPath,
  isPublicCloudIngressPath,
  isIronleadsIngressPath,
  isInfraHealthPath,
  isSalesteamIngressPath,
  isSalesteamOutreachIngressPath,
  isSalesteamProspectsIngressPath,
  isSuccessTeamAccountsIngressPath,
  isSuccessTeamAdvisoryIngressPath,
  isSuccessTeamHealthSnapshotIngressPath,
  isSuccessTeamIngressPath,
  isSupportTeamIngressPath,
  isSupportTeamTicketsIngressPath,
  isPublicRoute,
  isReportsAuditTrailPath,
  isReportsAuditTrailPathWithTenant,
  isReportsPath,
  isScrollableStandalonePath,
  isViewportBoundedDashboardPath,
} from "@/app/utils/grcRouteMatch";

describe("grcRouteMatch", () => {
  it("detects global reports hub and sub-routes", () => {
    expect(isReportsPath("/reports")).toBe(true);
    expect(isReportsPath("/reports/quick")).toBe(true);
    expect(isReportsPath("/medshield/reports")).toBe(false);
  });

  it("detects global reports audit trail (not tenant-prefixed)", () => {
    expect(isReportsAuditTrailPath("/reports/audit-trail")).toBe(true);
    expect(isReportsAuditTrailPath("/reports/audit-trail/export")).toBe(true);
    expect(isReportsAuditTrailPath("/medshield/reports/audit-trail")).toBe(false);
  });

  it("detects legacy audit-trail redirect path", () => {
    expect(isLegacyAuditTrailRedirectPath("/audit-trail")).toBe(true);
  });

  it("detects tenant-prefixed reports audit trail", () => {
    expect(isReportsAuditTrailPathWithTenant("/medshield/reports/audit-trail", "/medshield")).toBe(true);
    expect(isReportsAuditTrailPathWithTenant("/reports/audit-trail", "")).toBe(true);
  });

  it("detects AppShell standalone scroll routes", () => {
    expect(isScrollableStandalonePath("/board-report")).toBe(true);
    expect(isScrollableStandalonePath("/integrity")).toBe(true);
    expect(isScrollableStandalonePath("/reports/audit-trail")).toBe(true);
    expect(isScrollableStandalonePath("/profile")).toBe(true);
    expect(isScrollableStandalonePath("/settings/config")).toBe(true);
    expect(isScrollableStandalonePath("/trust")).toBe(true);
    expect(isScrollableStandalonePath("/vendors")).toBe(true);
    expect(isScrollableStandalonePath("/exports")).toBe(true);
    expect(isScrollableStandalonePath("/medshield/config")).toBe(true);
    expect(isScrollableStandalonePath("/")).toBe(false);
    expect(isScrollableStandalonePath("/cockpit")).toBe(false);
  });

  it("detects viewport-bounded dashboard paths", () => {
    expect(isViewportBoundedDashboardPath("/")).toBe(true);
    expect(isViewportBoundedDashboardPath("/cockpit")).toBe(true);
    expect(isViewportBoundedDashboardPath("/integrity")).toBe(false);
  });

  it("detects dashboard route group paths for layout shell delegation", () => {
    expect(isDashboardRouteGroupPath("/trust")).toBe(true);
    expect(isDashboardRouteGroupPath("/trust/dpa")).toBe(true);
    expect(isDashboardRouteGroupPath("/exports")).toBe(true);
    expect(isDashboardRouteGroupPath("/dashboard/support")).toBe(true);
    expect(isDashboardRouteGroupPath("/dashboard/operations")).toBe(true);
    expect(isDashboardRouteGroupPath("/boardroom/admin/audit-logs")).toBe(true);
    expect(isDashboardRouteGroupPath("/dashboard")).toBe(false);
  });

  it("detects Ironframe SaaS workspace paths for Cyber Command Dark lock", () => {
    expect(isIronframeSaaSAppPath("/exports")).toBe(true);
    expect(isIronframeSaaSAppPath("/vendors")).toBe(true);
    expect(isIronframeSaaSAppPath("/integrity")).toBe(true);
    expect(isIronframeSaaSAppPath("/login")).toBe(false);
    expect(isIronframeSaaSAppPath("/marketing")).toBe(false);
    expect(isIronframeSaaSAppPath("/register/setup")).toBe(false);
    expect(isIronframeSaaSAppPath("/", { hostTenantSlug: "bwc" })).toBe(true);
    expect(isIronframeSaaSAppPath("/", { authenticated: true })).toBe(true);
    expect(isIronframeSaaSAppPath("/docs/training/quickstart", { authenticated: true })).toBe(true);
    expect(isIronframeSaaSAppPath("/docs/training/quickstart")).toBe(true);
  });

  it("allows robots.txt through public cloud ingress", () => {
    expect(isPublicCloudIngressPath("/robots.txt")).toBe(true);
    expect(isPublicCloudIngressPath("/sitemap.xml")).toBe(true);
  });

  it("recognizes Ironleads signed perimeter ingress path", () => {
    expect(isIronleadsIngressPath("/api/v1/ingress/ironleads")).toBe(true);
    expect(isIronleadsIngressPath("/api/v1/ingress/ironleads/extra")).toBe(false);
  });

  it("recognizes SalesTeam signed perimeter ingress paths", () => {
    expect(isSalesteamProspectsIngressPath("/api/v1/ingress/salesteam/prospects")).toBe(true);
    expect(isSalesteamOutreachIngressPath("/api/v1/ingress/salesteam/outreach")).toBe(true);
    expect(isSalesteamIngressPath("/api/v1/ingress/salesteam/prospects")).toBe(true);
    expect(isSalesteamIngressPath("/api/v1/ingress/salesteam/other")).toBe(false);
  });

  it("recognizes SuccessTeam signed perimeter ingress paths", () => {
    expect(isSuccessTeamAccountsIngressPath("/api/v1/ingress/success-team/accounts")).toBe(true);
    expect(isSuccessTeamHealthSnapshotIngressPath("/api/v1/ingress/success-team/health-snapshot")).toBe(
      true,
    );
    expect(isSuccessTeamAdvisoryIngressPath("/api/v1/ingress/success-team/advisory")).toBe(true);
    expect(isSuccessTeamIngressPath("/api/v1/ingress/success-team/advisory")).toBe(true);
    expect(isSuccessTeamIngressPath("/api/v1/ingress/success-team/other")).toBe(false);
  });

  it("recognizes SupportTeam signed perimeter ingress paths", () => {
    expect(isSupportTeamTicketsIngressPath("/api/v1/ingress/support-team/tickets")).toBe(true);
    expect(isSupportTeamIngressPath("/api/v1/ingress/support-team/reply")).toBe(true);
    expect(isSupportTeamIngressPath("/api/v1/ingress/support-team/other")).toBe(false);
  });

  it("recognizes infra health liveness path", () => {
    expect(isInfraHealthPath("/api/health")).toBe(true);
    expect(isInfraHealthPath("/api/health/extra")).toBe(false);
  });

  it("keeps marketing public while gating product docs and pricing", () => {
    expect(isPublicRoute("/marketing")).toBe(true);
    expect(isPublicRoute("/docs/TAS.md")).toBe(false);
    expect(isPublicRoute("/pricing")).toBe(false);
    expect(isPublicRoute("/governance-frame/briefing")).toBe(false);
  });

  it("marks authenticated product surfaces for middleware and audits", () => {
    expect(isAuthenticatedProductSurfacePath("/docs/competitive-landscape.md")).toBe(true);
    expect(isAuthenticatedProductSurfacePath("/pricing")).toBe(true);
    expect(isAuthenticatedProductSurfacePath("/governance-frame/q1")).toBe(true);
    expect(isAuthenticatedProductSurfacePath("/api/docs/download-protocol")).toBe(true);
    expect(isAuthenticatedProductSurfacePath("/api/docs/hub-asset/product/foo.html")).toBe(true);
    expect(isAuthenticatedProductSurfacePath("/marketing")).toBe(false);
  });

  it("builds memoized header route matrix for tenant vendors and audit trail", () => {
    const global = buildHeaderRouteMatrix("/reports/audit-trail");
    expect(global.isAuditTrailRoute).toBe(true);
    expect(global.isOpSupportRoute).toBe(false);
    expect(global.isVendorsRoute).toBe(false);

    const vendors = buildHeaderRouteMatrix("/medshield/vendors/onboarding");
    expect(vendors.currentTenant).toBe("medshield");
    expect(vendors.isVendorsRoute).toBe(true);
    expect(vendors.prefix).toBe("/medshield");
    expect(vendors.homeLink).toBe("/");

    const subdomainVendors = buildHeaderRouteMatrix("/vendors/onboarding", "acmecorp");
    expect(subdomainVendors.currentTenant).toBe("acmecorp");
    expect(subdomainVendors.isVendorsRoute).toBe(true);
    expect(subdomainVendors.prefix).toBe("");

    const config = buildHeaderRouteMatrix("/settings/config");
    expect(config.isConfigRoute).toBe(true);
    expect(config.homeLink).toBe("/");

    const ops = buildHeaderRouteMatrix("/opsupport");
    expect(ops.isOpSupportRoute).toBe(true);
  });
});
