import { describe, expect, it } from "vitest";

import { parseCheckoutSessionCompleted } from "@/app/lib/billing/parseCheckoutSession";
import type Stripe from "stripe";

function mockSession(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: "cs_test_123",
    object: "checkout.session",
    amount_total: 499900,
    customer: "cus_test_abc",
    customer_details: { email: "buyer@acmecorp.com" },
    metadata: {
      slug: "acmecorp",
      companyName: "Acme Corporation",
    },
    ...overrides,
  } as Stripe.Checkout.Session;
}

describe("parseCheckoutSessionCompleted", () => {
  it("extracts email, slug, company, and bigint cents", () => {
    const parsed = parseCheckoutSessionCompleted(mockSession());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.email).toBe("buyer@acmecorp.com");
    expect(parsed.data.slug).toBe("acmecorp");
    expect(parsed.data.companyName).toBe("Acme Corporation");
    expect(parsed.data.amountTotalCents).toBe(499900n);
    expect(parsed.data.stripeCustomerId).toBe("cus_test_abc");
  });

  it("rejects missing slug metadata", () => {
    const parsed = parseCheckoutSessionCompleted(
      mockSession({ metadata: { companyName: "Acme" } }),
    );
    expect(parsed.ok).toBe(false);
  });
});
