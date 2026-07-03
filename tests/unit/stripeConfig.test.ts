import { afterEach, describe, expect, it } from "vitest";

import {
  resolveStripeBillingWebhookSecret,
  resolveStripeCredentialMode,
  resolveStripeInstantCheckoutWebhookSecret,
  resolveStripeSecretKey,
} from "@/config/stripe";

describe("stripe config", () => {
  afterEach(() => {
    delete process.env.STRIPE_CREDENTIAL_MODE;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY_TEST;
    delete process.env.STRIPE_SECRET_KEY_LIVE;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_INSTANT_CHECKOUT_WEBHOOK_SECRET;
    delete process.env.STRIPE_BILLING_WEBHOOK_SECRET;
  });

  it("prefers mode-specific secret keys", () => {
    process.env.STRIPE_CREDENTIAL_MODE = "test";
    process.env.STRIPE_SECRET_KEY_TEST = "sk_test_mode";
    process.env.STRIPE_SECRET_KEY_LIVE = "sk_live_mode";
    expect(resolveStripeSecretKey()).toBe("sk_test_mode");

    process.env.STRIPE_CREDENTIAL_MODE = "live";
    expect(resolveStripeSecretKey()).toBe("sk_live_mode");
  });

  it("infers live mode from sk_live_ prefix", () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_abc";
    expect(resolveStripeCredentialMode()).toBe("live");
  });

  it("resolves route-specific webhook secrets with legacy fallback", () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_legacy";
    expect(resolveStripeInstantCheckoutWebhookSecret()).toBe("whsec_legacy");
    expect(resolveStripeBillingWebhookSecret()).toBe("whsec_legacy");

    process.env.STRIPE_INSTANT_CHECKOUT_WEBHOOK_SECRET = "whsec_instant";
    process.env.STRIPE_BILLING_WEBHOOK_SECRET = "whsec_billing";
    expect(resolveStripeInstantCheckoutWebhookSecret()).toBe("whsec_instant");
    expect(resolveStripeBillingWebhookSecret()).toBe("whsec_billing");
  });
});
