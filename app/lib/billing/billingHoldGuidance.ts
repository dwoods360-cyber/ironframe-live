/** Operator-facing copy when billing is PENDING and a Stripe checkout URL exists. */

export function shouldShowLocalStripeWebhookHint(): boolean {
  return process.env.NODE_ENV === "development";
}

export const BILLING_HOLD_LOCAL_WEBHOOK_HINT =
  "Paid in Stripe but still see PENDING? Local dev needs webhook forwarding: run npm run dev:stripe:multiplexer and stripe listen --forward-to http://127.0.0.1:4242, then retry checkout or ask an operator to activate billing.";

export const BILLING_HOLD_PRODUCTION_PENDING_HINT =
  "After checkout, billing usually activates within 60 seconds — tap Refresh below. If status stays PENDING, contact sales with your workspace slug.";

export function resolveBillingPendingHint(): string {
  return shouldShowLocalStripeWebhookHint()
    ? BILLING_HOLD_LOCAL_WEBHOOK_HINT
    : BILLING_HOLD_PRODUCTION_PENDING_HINT;
}
