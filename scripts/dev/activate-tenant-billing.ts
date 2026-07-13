/**
 * Path B — simulate payment_intent.succeeded for an existing tenant slug.
 *
 * Usage: npx tsx scripts/dev/activate-tenant-billing.ts --slug acmecorp
 */
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

import { manualStripeCustomerIdForSlug, TENANT_BILLING_STATUS } from "../../app/lib/billing/constants";
import {
  assertDevServerReachable,
  loadStripeSmokeEnv,
  postSignedStripeWebhook,
  requireStripeSmokeEnv,
} from "./stripeSmokeEnv";

function readArg(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1]?.trim() || null;
}

function buildPaymentIntentSucceededEvent(input: {
  tenantSlug: string;
  stripeCustomerId: string;
  paymentIntentId: string;
}): Stripe.Event {
  const paymentIntent = {
    id: input.paymentIntentId,
    object: "payment_intent",
    amount_received: 4_999_00,
    customer: input.stripeCustomerId,
    metadata: {
      tenant_slug: input.tenantSlug,
    },
  } as Stripe.PaymentIntent;

  return {
    id: `evt_billing_activation_${Date.now()}`,
    object: "event",
    api_version: "2024-11-20.acacia",
    created: Math.floor(Date.now() / 1000),
    type: "payment_intent.succeeded",
    livemode: false,
    pending_webhooks: 0,
    request: null,
    data: { object: paymentIntent },
  } as Stripe.Event;
}

async function main(): Promise<void> {
  const slug = readArg("--slug")?.toLowerCase() ?? "";
  if (!slug) {
    throw new Error("--slug is required (e.g. --slug acmecorp)");
  }

  loadStripeSmokeEnv();
  const { stripeSecretKey, billingSecret } = requireStripeSmokeEnv();
  await assertDevServerReachable();

  const prisma = new PrismaClient();
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true },
    });
    if (!tenant) {
      throw new Error(`Tenant "${slug}" not found.`);
    }

    const billing = await prisma.tenantBilling.findUnique({
      where: { tenantSlug: slug },
    });
    if (!billing) {
      throw new Error(`tenant_billing row missing for "${slug}".`);
    }

    console.log(`Before: ${slug} billing status = ${billing.status}`);

    const event = buildPaymentIntentSucceededEvent({
      tenantSlug: slug,
      stripeCustomerId: billing.stripeCustomerId || manualStripeCustomerIdForSlug(slug),
      paymentIntentId: `pi_${slug}_${Date.now()}`,
    });

    const { status, body } = await postSignedStripeWebhook({
      path: "/api/billing/webhook",
      payload: JSON.stringify(event),
      secret: billingSecret,
      stripeSecretKey,
    });

    console.log(`Webhook POST /api/billing/webhook -> ${status}`);
    console.log(JSON.stringify(body, null, 2));

    const after = await prisma.tenantBilling.findUnique({ where: { tenantSlug: slug } });
    console.log(`After: ${slug} billing status = ${after?.status}`);

    if (status !== 200 || after?.status !== TENANT_BILLING_STATUS.ACTIVE) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
