/** Stripe instant-checkout provisioning — operator audit identity. */
export const STRIPE_INSTANT_CHECKOUT_OPERATOR_ID = "STRIPE_INSTANT_CHECKOUT";

export const STRIPE_WEBHOOK_PATH = "/api/webhooks/stripe";

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
