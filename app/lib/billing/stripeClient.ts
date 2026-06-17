import "server-only";

import Stripe from "stripe";

import { resolveStripeSecretKey } from "@/config/stripe";

let stripeSingleton: Stripe | null = null;

export function getStripeServerClient(): Stripe | null {
  const key = resolveStripeSecretKey();
  if (!key) return null;
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key);
  }
  return stripeSingleton;
}

export function verifyStripeWebhookEvent(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string,
): Stripe.Event {
  const stripe = getStripeServerClient();
  if (!stripe) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  if (!signatureHeader?.trim()) {
    throw new Error("Missing stripe-signature header.");
  }
  if (!webhookSecret.trim()) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
  }
  return stripe.webhooks.constructEvent(rawBody, signatureHeader, webhookSecret);
}
