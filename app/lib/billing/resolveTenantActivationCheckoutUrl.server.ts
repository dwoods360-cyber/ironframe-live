import "server-only";

import Stripe from "stripe";

import { resolveStripeSecretKey } from "@/config/stripe";
import { buildTenantSubdomainOrigin } from "@/app/lib/tenantSubdomain";
import { resolveCommandTierPriceId } from "@/app/lib/billing/stripeCatalog.server";
import { ensureRealStripeCustomerForTenant } from "@/app/lib/billing/tenantStripeCustomer.server";
import prisma from "@/lib/prisma";

function buildTenantActivationCheckoutSuccessUrl(tenantSlug: string): string {
  const port = Number(process.env.PORT?.trim() || "3000") || 3000;
  const origin = buildTenantSubdomainOrigin(tenantSlug.trim().toLowerCase(), port).replace(
    /\/+$/,
    "",
  );
  return `${origin}/get-started?billingRefresh=1`;
}

type ActivationCheckoutInput = {
  tenantSlug?: string;
  tenantUuid?: string;
  companyName?: string;
};

async function resolveTenantForActivationCheckout(
  input: ActivationCheckoutInput,
): Promise<{ id: string; slug: string; name: string | null } | null> {
  if (input.tenantUuid?.trim()) {
    return prisma.tenant.findUnique({
      where: { id: input.tenantUuid.trim() },
      select: { id: true, slug: true, name: true },
    });
  }

  const slug = input.tenantSlug?.trim().toLowerCase() ?? "";
  if (slug.length < 2) return null;

  return prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true },
  });
}

/**
 * GRC canonical activation — server-minted Checkout Session bound to tenant UUID + Stripe Customer.
 * Webhook validates client_reference_id / payment_intent.metadata.tenant_uuid and customer match.
 */
export async function resolveTenantActivationCheckoutUrl(
  input: ActivationCheckoutInput,
): Promise<string | null> {
  const stripeSecretKey = resolveStripeSecretKey();
  if (!stripeSecretKey) return null;

  const tenant = await resolveTenantForActivationCheckout(input);
  if (!tenant) return null;

  const stripeCustomerId = await ensureRealStripeCustomerForTenant({
    tenantUuid: tenant.id,
    tenantSlug: tenant.slug,
    companyName: input.companyName ?? tenant.name ?? undefined,
  });
  if (!stripeCustomerId) return null;

  try {
    const stripe = new Stripe(stripeSecretKey);
    const priceId = await resolveCommandTierPriceId(stripe);
    if (!priceId) return null;

    const successUrl = buildTenantActivationCheckoutSuccessUrl(tenant.slug);
    const companyName = (input.companyName ?? tenant.name ?? "").trim();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: stripeCustomerId,
      client_reference_id: tenant.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: successUrl,
      metadata: {
        commercial_flow: "tenant_activation",
        tenant_uuid: tenant.id,
        tenant_slug: tenant.slug,
        ...(companyName ? { companyName } : {}),
      },
      payment_intent_data: {
        metadata: {
          commercial_flow: "tenant_activation",
          tenant_uuid: tenant.id,
          tenant_slug: tenant.slug,
        },
      },
    });

    return session.url ?? null;
  } catch (error) {
    console.error("[resolveTenantActivationCheckoutUrl]", error);
    return null;
  }
}

export async function resolveTenantActivationCheckoutUrlForUuid(
  tenantUuid: string,
): Promise<string | null> {
  return resolveTenantActivationCheckoutUrl({ tenantUuid });
}
