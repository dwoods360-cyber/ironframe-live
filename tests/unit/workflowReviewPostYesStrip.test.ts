import { describe, expect, it } from "vitest";

import {
  WORKFLOW_REVIEW_ORDER_FORM_HREF,
  WORKFLOW_REVIEW_PROVISION_HREF,
} from "@/app/(dashboard)/dashboard/operations/workflow-review/WorkflowReviewPostYesStrip";

describe("WorkflowReviewPostYesStrip hrefs", () => {
  it("routes after-yes to operator library order form, not raw docs path", () => {
    expect(WORKFLOW_REVIEW_ORDER_FORM_HREF).toBe("/dashboard/operations/library/order-form");
    expect(WORKFLOW_REVIEW_ORDER_FORM_HREF).not.toContain("docs/sales");
    expect(WORKFLOW_REVIEW_ORDER_FORM_HREF).not.toMatch(/\.md$/);
  });

  it("routes provision to Path B onboarding admin", () => {
    expect(WORKFLOW_REVIEW_PROVISION_HREF).toBe("/admin/onboarding");
  });
});
