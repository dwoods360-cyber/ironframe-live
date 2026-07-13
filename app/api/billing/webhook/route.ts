import { NextResponse } from "next/server";

import { parsePaymentIntentSucceeded } from "@/app/lib/billing/parsePaymentIntent";
import { verifyStripeWebhookEvent } from "@/app/lib/billing/stripeClient";
import { fulfillStripePaymentIntentSucceeded } from "@/app/lib/server/stripePaymentIntentCore";
import { resolveStripeBillingWebhookSecret } from "@/config/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Production revenue webhook — cryptographically verified Stripe events (Irongate DMZ perimeter).
 * Activates TenantBilling on payment_intent.succeeded (BigInt amount_received cents in audit trail).
 */
export async function POST(request: Request) {
  const webhookSecret = resolveStripeBillingWebhookSecret();
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
    console.error("[billing/webhook] verify", message);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  if (event.type !== "payment_intent.succeeded") {
    return NextResponse.json({ ok: true, received: true, ignored: event.type });
  }

  const paymentIntent = event.data.object;
  if (paymentIntent.object !== "payment_intent") {
    return NextResponse.json({ ok: false, error: "Invalid payment_intent object." }, { status: 400 });
  }

  const parsed = parsePaymentIntentSucceeded(paymentIntent);
  if (!parsed.ok) {
    console.error("[billing/webhook] parse", parsed.error);
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 422 });
  }

  try {
    const result = await fulfillStripePaymentIntentSucceeded(parsed.data);
    if (!result.ok) {
      console.error("[billing/webhook] fulfill", result.error);
      const status = result.retryable ? 500 : 409;
      return NextResponse.json(
        { ok: false, error: result.error, retryable: result.retryable },
        { status },
      );
    }

    console.info(
      "[billing/webhook] payment_intent.succeeded",
      JSON.stringify({
        tenantSlug: result.tenantSlug,
        idempotent: result.idempotent,
        amountReceivedCents: result.amountReceivedCents,
      }),
    );

    return NextResponse.json({
      ok: true,
      tenantSlug: result.tenantSlug,
      idempotent: result.idempotent,
      amountReceivedCents: result.amountReceivedCents,
    });
  } catch (err) {
    console.error("[billing/webhook] unhandled", err);
    return NextResponse.json(
      { ok: false, error: "Unhandled billing activation failure.", retryable: true },
      { status: 500 },
    );
  }
}
