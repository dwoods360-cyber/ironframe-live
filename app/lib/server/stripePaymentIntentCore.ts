import "server-only";

import { TENANT_BILLING_STATUS, isPlaceholderStripeCustomerId } from "@/app/lib/billing/constants";
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
  let tenant: { id: string; slug: string } | null = null;

  if (parsed.tenantUuid) {
    tenant = await prisma.tenant.findUnique({
      where: { id: parsed.tenantUuid },
      select: { id: true, slug: true },
    });
    if (!tenant) {
      return {
        ok: false,
        error: `Tenant UUID "${parsed.tenantUuid}" is not provisioned.`,
        retryable: false,
      };
    }
    if (parsed.tenantSlug && tenant.slug !== parsed.tenantSlug) {
      return {
        ok: false,
        error: `Payment metadata slug "${parsed.tenantSlug}" does not match tenant UUID (${tenant.slug}).`,
        retryable: false,
      };
    }
  } else {
    tenant = await prisma.tenant.findUnique({
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
  }

  const tenantSlug = tenant.slug;

  const billingRow = await prisma.tenantBilling.findUnique({
    where: { tenantSlug },
    select: { tenantSlug: true, status: true, stripeCustomerId: true },
  });
  if (!billingRow) {
    return {
      ok: false,
      error: `Tenant "${tenantSlug}" has no billing row — provision the workspace before activation payment.`,
      retryable: false,
    };
  }

  if (
    !isPlaceholderStripeCustomerId(billingRow.stripeCustomerId) &&
    billingRow.stripeCustomerId !== parsed.stripeCustomerId
  ) {
    return {
      ok: false,
      error: `Stripe customer on payment does not match the workspace billing record. Use the checkout link issued at provision for "${tenantSlug}".`,
      retryable: false,
    };
  }

  const existingBilling = await findTenantBillingByStripeCustomerId(parsed.stripeCustomerId);
  if (existingBilling && existingBilling.tenantSlug !== tenantSlug) {
    return {
      ok: false,
      error: `Stripe customer is bound to "${existingBilling.tenantSlug}", not "${tenantSlug}". Use the tenant-scoped activation checkout for this workspace.`,
      retryable: false,
    };
  }

  if (
    existingBilling?.status === TENANT_BILLING_STATUS.ACTIVE &&
    existingBilling.tenantSlug === tenantSlug
  ) {
    return {
      ok: true,
      tenantSlug,
      idempotent: true,
      amountReceivedCents: parsed.amountReceivedCents.toString(),
    };
  }

  try {
    await upsertTenantBillingFromStripe({
      tenantSlug,
      stripeCustomerId: parsed.stripeCustomerId,
      status: TENANT_BILLING_STATUS.ACTIVE,
    });

    await auditLogCreateLoose({
      data: {
        action: "STRIPE_PAYMENT_INTENT_BILLING_ACTIVE",
        operatorId: STRIPE_PAYMENT_INTENT_OPERATOR_ID,
        tenantId: tenant.id,
        justification: `Stripe payment_intent.succeeded (${parsed.paymentIntentId}) activated billing for ${tenantSlug} (tenant_uuid=${tenant.id}); amount_received_cents=${parsed.amountReceivedCents.toString()}.`,
      },
    });

    return {
      ok: true,
      tenantSlug,
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
