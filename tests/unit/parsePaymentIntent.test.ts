import { describe, expect, it } from "vitest";
import type Stripe from "stripe";

import { parsePaymentIntentSucceeded } from "@/app/lib/billing/parsePaymentIntent";

function mockPaymentIntent(
  overrides: Partial<Stripe.PaymentIntent> = {},
): Stripe.PaymentIntent {
  return {
    id: "pi_test_123",
    object: "payment_intent",
    amount: 499900,
    amount_received: 499900,
    customer: "cus_test_abc",
    metadata: {
      tenant_slug: "acmecorp",
      email: "buyer@acmecorp.com",
    },
    ...overrides,
  } as Stripe.PaymentIntent;
}

describe("parsePaymentIntentSucceeded", () => {
  it("extracts tenant slug, customer id, and bigint cents", () => {
    const parsed = parsePaymentIntentSucceeded(mockPaymentIntent());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.tenantSlug).toBe("acmecorp");
    expect(parsed.data.stripeCustomerId).toBe("cus_test_abc");
    expect(parsed.data.amountReceivedCents).toBe(499900n);
    expect(parsed.data.paymentIntentId).toBe("pi_test_123");
  });

  it("rejects missing tenant_slug metadata", () => {
    const parsed = parsePaymentIntentSucceeded(
      mockPaymentIntent({ metadata: { email: "a@b.com" } }),
    );
    expect(parsed.ok).toBe(false);
  });
});
