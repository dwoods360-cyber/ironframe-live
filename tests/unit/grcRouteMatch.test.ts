import { describe, expect, it } from "vitest";
import {
  buildHeaderRouteMatrix,
  isDashboardRouteGroupPath,
  isLegacyAuditTrailRedirectPath,
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
    expect(isScrollableStandalonePath("/dashboard/exports")).toBe(true);
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
    expect(isDashboardRouteGroupPath("/dashboard/support")).toBe(true);
    expect(isDashboardRouteGroupPath("/boardroom/admin/audit-logs")).toBe(true);
    expect(isDashboardRouteGroupPath("/dashboard")).toBe(false);
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
