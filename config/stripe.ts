/** Stripe instant-checkout provisioning — operator audit identity. */
export const STRIPE_INSTANT_CHECKOUT_OPERATOR_ID = "STRIPE_INSTANT_CHECKOUT";

/** Stripe payment_intent.succeeded billing activation — operator audit identity. */
export const STRIPE_PAYMENT_INTENT_OPERATOR_ID = "STRIPE_PAYMENT_INTENT";

export const STRIPE_WEBHOOK_PATH = "/api/webhooks/stripe";

/** Production revenue webhook — payment_intent.succeeded → TenantBilling ACTIVE. */
export const STRIPE_BILLING_WEBHOOK_PATH = "/api/billing/webhook";

export const STRIPE_WEBHOOK_PATHS = [STRIPE_WEBHOOK_PATH, STRIPE_BILLING_WEBHOOK_PATH] as const;

/** Hosted Checkout URL configured in Stripe Dashboard (Payment Link or Checkout session template). */
export function resolveStripeCommandTierCheckoutUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_STRIPE_COMMAND_TIER_CHECKOUT_URL?.trim();
  return url && url.startsWith("https://") ? url : null;
}

export function resolveStripeWebhookSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
}

export function resolveStripeSecretKey(): string {
  return process.env.STRIPE_SECRET_KEY?.trim() ?? "";
}
