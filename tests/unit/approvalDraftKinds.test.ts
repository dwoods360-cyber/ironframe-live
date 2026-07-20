import { describe, expect, it } from "vitest";

import {
  approvalsHref,
  parseApprovalKindFilter,
} from "@/app/lib/approvalDraftKinds";

describe("approvalDraftKinds", () => {
  it("parses kind query values", () => {
    expect(parseApprovalKindFilter("SALES")).toBe("SALES");
    expect(parseApprovalKindFilter("support")).toBe("SUPPORT");
    expect(parseApprovalKindFilter("CS")).toBe("CUSTOMER_SUCCESS");
    expect(parseApprovalKindFilter("CUSTOMER_SUCCESS")).toBe("CUSTOMER_SUCCESS");
    expect(parseApprovalKindFilter(null)).toBe("ALL");
    expect(parseApprovalKindFilter("nope")).toBe("ALL");
  });

  it("builds filtered approvals hrefs", () => {
    expect(approvalsHref("ALL")).toBe("/dashboard/admin/approvals");
    expect(approvalsHref("SALES")).toBe("/dashboard/admin/approvals?kind=SALES");
    expect(approvalsHref("SUPPORT")).toBe("/dashboard/admin/approvals?kind=SUPPORT");
    expect(approvalsHref("CUSTOMER_SUCCESS")).toBe(
      "/dashboard/admin/approvals?kind=CUSTOMER_SUCCESS",
    );
  });
});
