import { NextResponse } from "next/server";

import { parseCheckoutSessionCompleted } from "@/app/lib/billing/parseCheckoutSession";
import { verifyStripeWebhookEvent } from "@/app/lib/billing/stripeClient";
import { fulfillStripeInstantCheckout } from "@/app/lib/server/stripeInstantProvisionCore";
import { isPublicInstantCheckoutEnabled } from "@/config/commercialGates";
import { resolveStripeInstantCheckoutWebhookSecret } from "@/config/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const webhookSecret = resolveStripeInstantCheckoutWebhookSecret();
  if (!webhookSecret) {
    return NextResponse.json({ ok: false, error: "Webhook not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  let event;
  try {
    event = verifyStripeWebhookEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature verification failed.";
    console.error("[stripe/webhook] verify", message);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  // Gate is off for design-partner Path B — still verify + 2xx so live Stripe endpoints stay healthy.
  if (!isPublicInstantCheckoutEnabled()) {
    return NextResponse.json({
      ok: true,
      received: true,
      ignored: true,
      code: "PUBLIC_INSTANT_CHECKOUT_DISABLED",
      eventType: event.type,
    });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ ok: true, received: true, ignored: event.type });
  }

  const session = event.data.object;
  if (session.object !== "checkout.session") {
    return NextResponse.json({ ok: false, error: "Invalid session object." }, { status: 400 });
  }

  const parsed = parseCheckoutSessionCompleted(session);
  if (!parsed.ok) {
    console.error("[stripe/webhook] parse", parsed.error);
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 422 });
  }

  try {
    const result = await fulfillStripeInstantCheckout(parsed.data);
    if (!result.ok) {
      console.error("[stripe/webhook] fulfill", result.error);
      const status = result.retryable ? 500 : 409;
      return NextResponse.json({ ok: false, error: result.error, retryable: result.retryable }, { status });
    }

    const tenantSlug = result.tenantSlug.trim();
    if (!tenantSlug) {
      console.error("[stripe/webhook] fulfill returned an empty tenant slug");
      return NextResponse.json(
        { ok: false, error: "Provisioning completed without a tenant identifier.", retryable: true },
        { status: 500 },
      );
    }

    const successPayload = {
      ok: true as const,
      tenantSlug,
      email: result.email,
      idempotent: result.idempotent,
    };

    return NextResponse.json(
      result.invitePending
        ? {
            ...successPayload,
            status: "SUCCESS",
            invitePending: true,
            message: result.message,
          }
        : successPayload,
    );
  } catch (err) {
    console.error("[stripe/webhook] unhandled", err);
    return NextResponse.json(
      { ok: false, error: "Unhandled provisioning failure.", retryable: true },
      { status: 500 },
    );
  }
}
