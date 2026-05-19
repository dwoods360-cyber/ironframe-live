import { describe, expect, it } from "vitest";
import {
  isLegacyAuditTrailRedirectPath,
  isReportsAuditTrailPath,
} from "@/app/utils/grcRouteMatch";

describe("grcRouteMatch", () => {
  it("detects global reports audit trail (not tenant-prefixed)", () => {
    expect(isReportsAuditTrailPath("/reports/audit-trail")).toBe(true);
    expect(isReportsAuditTrailPath("/reports/audit-trail/export")).toBe(true);
    expect(isReportsAuditTrailPath("/medshield/reports/audit-trail")).toBe(false);
  });

  it("detects legacy audit-trail redirect path", () => {
    expect(isLegacyAuditTrailRedirectPath("/audit-trail")).toBe(true);
  });
});
