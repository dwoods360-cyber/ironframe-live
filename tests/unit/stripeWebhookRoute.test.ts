import { describe, expect, it, vi, beforeEach } from "vitest";

import * as StripeClient from "@/app/lib/billing/stripeClient";
import * as InstantProvisionCore from "@/app/lib/server/stripeInstantProvisionCore";
import { POST } from "@/app/api/webhooks/stripe/route";

describe("/api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_INSTANT_CHECKOUT_WEBHOOK_SECRET = "whsec_instant_test";
  });

  it("returns 503 when instant checkout webhook secret is missing", async () => {
    delete process.env.STRIPE_INSTANT_CHECKOUT_WEBHOOK_SECRET;

    const req = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "sig" },
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it("ignores non checkout.session.completed events", async () => {
    vi.spyOn(StripeClient, "verifyStripeWebhookEvent").mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: {} },
    } as never);

    const req = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "sig" },
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ignored?: string };
    expect(body.ignored).toBe("payment_intent.succeeded");
  });

  it("provisions tenant on checkout.session.completed", async () => {
    vi.spyOn(StripeClient, "verifyStripeWebhookEvent").mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_1",
          object: "checkout.session",
          amount_total: 499900,
          customer: "cus_1",
          customer_details: { email: "buyer@ironframe.test" },
          metadata: { slug: "stripe-e2e-corp", companyName: "Stripe E2E Corp" },
        },
      },
    } as never);

    const fulfill = vi.spyOn(InstantProvisionCore, "fulfillStripeInstantCheckout").mockResolvedValue({
      ok: true,
      tenantSlug: "stripe-e2e-corp",
      workspaceUrl: "http://stripe-e2e-corp.lvh.me:3000",
      email: "buyer@ironframe.test",
      idempotent: false,
    });

    const req = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "sig" },
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(fulfill).toHaveBeenCalledOnce();
    const body = (await res.json()) as { tenantSlug?: string };
    expect(body.tenantSlug).toBe("stripe-e2e-corp");
  });
});
