import { describe, expect, it, vi, beforeEach } from "vitest";

import * as StripeClient from "@/app/lib/billing/stripeClient";
import * as PaymentIntentCore from "@/app/lib/server/stripePaymentIntentCore";
import { POST } from "@/app/api/billing/webhook/route";

describe("/api/billing/webhook", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  });

  it("ignores non payment_intent.succeeded events", async () => {
    vi.spyOn(StripeClient, "verifyStripeWebhookEvent").mockReturnValue({
      type: "customer.created",
      data: { object: {} },
    } as never);

    const req = new Request("http://localhost:3000/api/billing/webhook", {
      method: "POST",
      headers: { "stripe-signature": "sig" },
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ignored?: string };
    expect(body.ignored).toBe("customer.created");
  });

  it("activates billing on payment_intent.succeeded", async () => {
    vi.spyOn(StripeClient, "verifyStripeWebhookEvent").mockReturnValue({
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_1",
          object: "payment_intent",
          amount_received: 10000,
          customer: "cus_1",
          metadata: { tenant_slug: "acmecorp" },
        },
      },
    } as never);

    const fulfill = vi.spyOn(PaymentIntentCore, "fulfillStripePaymentIntentSucceeded").mockResolvedValue({
      ok: true,
      tenantSlug: "acmecorp",
      idempotent: false,
      amountReceivedCents: "10000",
    });

    const req = new Request("http://localhost:3000/api/billing/webhook", {
      method: "POST",
      headers: { "stripe-signature": "sig" },
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(fulfill).toHaveBeenCalledOnce();
    const body = (await res.json()) as { tenantSlug?: string };
    expect(body.tenantSlug).toBe("acmecorp");
  });
});
