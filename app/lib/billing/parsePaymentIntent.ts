import type Stripe from "stripe";

import { normalizeProvisionedTenantSlug } from "@/app/lib/tenantSlugRegistry";

export type ParsedPaymentIntentSucceeded = {
  tenantSlug: string;
  stripeCustomerId: string;
  paymentIntentId: string;
  amountReceivedCents: bigint;
  email: string | null;
};

export type ParsePaymentIntentResult =
  | { ok: true; data: ParsedPaymentIntentSucceeded }
  | { ok: false; error: string };

function readMetadataString(
  metadata: Stripe.Metadata | null | undefined,
  key: string,
): string {
  const raw = metadata?.[key];
  return typeof raw === "string" ? raw.trim() : "";
}

export function parsePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
): ParsePaymentIntentResult {
  const paymentIntentId = paymentIntent.id?.trim() ?? "";
  if (!paymentIntentId) {
    return { ok: false, error: "PaymentIntent id missing." };
  }

  const slugRaw =
    readMetadataString(paymentIntent.metadata, "tenant_slug") ||
    readMetadataString(paymentIntent.metadata, "slug");

  const tenantSlug = normalizeProvisionedTenantSlug(slugRaw);
  if (!tenantSlug) {
    return { ok: false, error: "PaymentIntent metadata.tenant_slug is missing or invalid." };
  }

  const customerRef = paymentIntent.customer;
  const stripeCustomerId =
    typeof customerRef === "string"
      ? customerRef.trim()
      : customerRef && typeof customerRef === "object" && "id" in customerRef
        ? String(customerRef.id ?? "").trim()
        : readMetadataString(paymentIntent.metadata, "stripe_customer_id");

  if (!stripeCustomerId) {
    return { ok: false, error: "PaymentIntent missing stripe customer id." };
  }

  const amountRaw = paymentIntent.amount_received ?? paymentIntent.amount;
  const amountReceivedCents =
    amountRaw == null || amountRaw < 0 ? 0n : BigInt(Math.trunc(amountRaw));

  const email =
    readMetadataString(paymentIntent.metadata, "email").toLowerCase() || null;

  return {
    ok: true,
    data: {
      tenantSlug,
      stripeCustomerId,
      paymentIntentId,
      amountReceivedCents,
      email,
    },
  };
}
