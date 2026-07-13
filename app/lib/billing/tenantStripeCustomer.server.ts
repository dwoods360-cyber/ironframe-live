import "server-only";

import Stripe from "stripe";

import { resolveStripeSecretKey } from "@/config/stripe";
import prisma from "@/lib/prisma";

import {
  isPlaceholderStripeCustomerId,
  manualStripeCustomerIdForSlug,
  TENANT_BILLING_STATUS,
} from "./constants";

export type TenantCommercialBillingResult = {
  stripeCustomerId: string;
  stripeCustomerLive: boolean;
};

/**
 * GRC canonical: bind one Stripe Customer to the tenant at provision (metadata.tenant_uuid).
 * Falls back to manual_pending_{slug} when Stripe keys are absent (CI / local without keys).
 */
export async function ensureTenantCommercialBillingAtProvision(input: {
  tenantUuid: string;
  tenantSlug: string;
  companyName?: string;
  billingEmail?: string;
}): Promise<TenantCommercialBillingResult> {
  const tenantSlug = input.tenantSlug.trim().toLowerCase();
  const tenantUuid = input.tenantUuid.trim();

  const existing = await prisma.tenantBilling.findUnique({
    where: { tenantSlug },
    select: { stripeCustomerId: true },
  });

  if (existing && !isPlaceholderStripeCustomerId(existing.stripeCustomerId)) {
    return { stripeCustomerId: existing.stripeCustomerId, stripeCustomerLive: true };
  }

  const stripeSecretKey = resolveStripeSecretKey();
  if (!stripeSecretKey) {
    const placeholderId = manualStripeCustomerIdForSlug(tenantSlug);
    await prisma.tenantBilling.upsert({
      where: { tenantSlug },
      create: {
        tenantSlug,
        stripeCustomerId: placeholderId,
        status: TENANT_BILLING_STATUS.PENDING,
      },
      update: { status: TENANT_BILLING_STATUS.PENDING },
    });
    return { stripeCustomerId: placeholderId, stripeCustomerLive: false };
  }

  const stripe = new Stripe(stripeSecretKey);
  const displayName = (input.companyName?.trim() || tenantSlug.replace(/-/g, " ")).slice(0, 250);
  const customer = await stripe.customers.create({
    name: displayName,
    ...(input.billingEmail?.trim()
      ? { email: input.billingEmail.trim().toLowerCase() }
      : {}),
    metadata: {
      tenant_uuid: tenantUuid,
      tenant_slug: tenantSlug,
      ironframe_commercial_flow: "design_partner_activation",
    },
  });

  await prisma.tenantBilling.upsert({
    where: { tenantSlug },
    create: {
      tenantSlug,
      stripeCustomerId: customer.id,
      status: TENANT_BILLING_STATUS.PENDING,
    },
    update: {
      stripeCustomerId: customer.id,
      status: TENANT_BILLING_STATUS.PENDING,
    },
  });

  return { stripeCustomerId: customer.id, stripeCustomerLive: true };
}

/** Upgrade placeholder billing row to a live Stripe customer when keys are configured. */
export async function ensureRealStripeCustomerForTenant(input: {
  tenantUuid: string;
  tenantSlug: string;
  companyName?: string;
  billingEmail?: string;
}): Promise<string | null> {
  const result = await ensureTenantCommercialBillingAtProvision(input);
  return result.stripeCustomerLive ? result.stripeCustomerId : null;
}
