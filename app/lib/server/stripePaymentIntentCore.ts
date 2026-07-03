import "server-only";

import { TENANT_BILLING_STATUS } from "@/app/lib/billing/constants";
import type { ParsedPaymentIntentSucceeded } from "@/app/lib/billing/parsePaymentIntent";
import {
  findTenantBillingByStripeCustomerId,
  upsertTenantBillingFromStripe,
} from "@/app/lib/billing/tenantBillingEntitlement";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import prisma from "@/lib/prisma";
import { STRIPE_PAYMENT_INTENT_OPERATOR_ID } from "@/config/stripe";

export type StripePaymentIntentFulfillResult =
  | { ok: true; tenantSlug: string; idempotent: boolean; amountReceivedCents: string }
  | { ok: false; error: string; retryable: boolean };

export async function fulfillStripePaymentIntentSucceeded(
  parsed: ParsedPaymentIntentSucceeded,
): Promise<StripePaymentIntentFulfillResult> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: parsed.tenantSlug },
    select: { id: true, slug: true },
  });

  if (!tenant) {
    return {
      ok: false,
      error: `Tenant "${parsed.tenantSlug}" is not provisioned.`,
      retryable: false,
    };
  }

  const existingBilling = await findTenantBillingByStripeCustomerId(parsed.stripeCustomerId);
  if (
    existingBilling?.status === TENANT_BILLING_STATUS.ACTIVE &&
    existingBilling.tenantSlug === parsed.tenantSlug
  ) {
    return {
      ok: true,
      tenantSlug: parsed.tenantSlug,
      idempotent: true,
      amountReceivedCents: parsed.amountReceivedCents.toString(),
    };
  }

  try {
    await upsertTenantBillingFromStripe({
      tenantSlug: parsed.tenantSlug,
      stripeCustomerId: parsed.stripeCustomerId,
      status: TENANT_BILLING_STATUS.ACTIVE,
    });

    await auditLogCreateLoose({
      data: {
        action: "STRIPE_PAYMENT_INTENT_BILLING_ACTIVE",
        operatorId: STRIPE_PAYMENT_INTENT_OPERATOR_ID,
        tenantId: tenant.id,
        justification: `Stripe payment_intent.succeeded (${parsed.paymentIntentId}) activated billing for ${parsed.tenantSlug}; amount_received_cents=${parsed.amountReceivedCents.toString()}.`,
      },
    });

    return {
      ok: true,
      tenantSlug: parsed.tenantSlug,
      idempotent: false,
      amountReceivedCents: parsed.amountReceivedCents.toString(),
    };
  } catch (e) {
    console.error("[fulfillStripePaymentIntentSucceeded]", e);
    return {
      ok: false,
      error: "Billing activation failed after payment_intent.succeeded.",
      retryable: true,
    };
  }
}
