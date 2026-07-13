import { describe, expect, it } from "vitest";

import {
  BILLING_HOLD_LOCAL_WEBHOOK_HINT,
  BILLING_HOLD_PRODUCTION_PENDING_HINT,
  resolveBillingPendingHint,
  shouldShowLocalStripeWebhookHint,
} from "@/app/lib/billing/billingHoldGuidance";

describe("billingHoldGuidance", () => {
  it("uses production operator copy outside development", () => {
    expect(shouldShowLocalStripeWebhookHint()).toBe(process.env.NODE_ENV === "development");
    expect(resolveBillingPendingHint()).toBe(
      process.env.NODE_ENV === "development"
        ? BILLING_HOLD_LOCAL_WEBHOOK_HINT
        : BILLING_HOLD_PRODUCTION_PENDING_HINT,
    );
  });

  it("keeps local webhook hint free of production-only phrasing", () => {
    expect(BILLING_HOLD_LOCAL_WEBHOOK_HINT).toContain("dev:stripe:multiplexer");
    expect(BILLING_HOLD_LOCAL_WEBHOOK_HINT).not.toContain("contact sales with your workspace slug");
  });

  it("keeps production hint free of local multiplexer commands", () => {
    expect(BILLING_HOLD_PRODUCTION_PENDING_HINT).toContain("contact sales");
    expect(BILLING_HOLD_PRODUCTION_PENDING_HINT).not.toContain("4242");
  });
});
