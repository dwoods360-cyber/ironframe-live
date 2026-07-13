/**
 * Path B smoke — payment_intent.succeeded flips PENDING → ACTIVE for an existing tenant.
 *
 * Usage: npm run smoke:billing:activation [-- --reset]
 */
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

import {
  manualStripeCustomerIdForSlug,
  TENANT_BILLING_STATUS,
} from "../../app/lib/billing/constants";

import {
  assertDevServerReachable,
  loadStripeSmokeEnv,
  postSignedStripeWebhook,
  requireStripeSmokeEnv,
} from "./stripeSmokeEnv";

const ACTIVATION_SLUG = "stripe-act-b1";
const COMPANY_NAME = "Stripe Activation Test Corp";

async function seedActivationTenant(prisma: PrismaClient, reset: boolean): Promise<void> {
  if (reset) {
    const existing = await prisma.tenant.findUnique({
      where: { slug: ACTIVATION_SLUG },
      select: { id: true },
    });
    if (existing) {
      await prisma.auditLog.deleteMany({ where: { tenantId: existing.id } });
      await prisma.userRoleAssignment.deleteMany({ where: { tenantId: existing.id } });
      await prisma.tenant.delete({ where: { id: existing.id } });
    }
    await prisma.tenantBilling.deleteMany({ where: { tenantSlug: ACTIVATION_SLUG } });
  }

  await prisma.tenant.upsert({
    where: { slug: ACTIVATION_SLUG },
    create: {
      name: COMPANY_NAME,
      slug: ACTIVATION_SLUG,
      industry: "Technology",
      ale_baseline: 4_999_00n,
    },
    update: {
      name: COMPANY_NAME,
    },
  });

  await prisma.tenantBilling.upsert({
    where: { tenantSlug: ACTIVATION_SLUG },
    create: {
      tenantSlug: ACTIVATION_SLUG,
      stripeCustomerId: manualStripeCustomerIdForSlug(ACTIVATION_SLUG),
      status: TENANT_BILLING_STATUS.PENDING,
    },
    update: {
      status: TENANT_BILLING_STATUS.PENDING,
      stripeCustomerId: manualStripeCustomerIdForSlug(ACTIVATION_SLUG),
    },
  });
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
  loadStripeSmokeEnv();
  const { stripeSecretKey, billingSecret } = requireStripeSmokeEnv();
  await assertDevServerReachable();

  const reset = process.argv.includes("--reset");
  const prisma = new PrismaClient();

  try {
    await seedActivationTenant(prisma, reset);

    const stripeCustomerId = `cus_${ACTIVATION_SLUG}_${Date.now()}`;
    const event = buildPaymentIntentSucceededEvent({
      tenantSlug: ACTIVATION_SLUG,
      stripeCustomerId,
      paymentIntentId: `pi_${ACTIVATION_SLUG}_${Date.now()}`,
    });

    const payload = JSON.stringify(event);
    const { status, body } = await postSignedStripeWebhook({
      path: "/api/billing/webhook",
      payload,
      secret: billingSecret,
      stripeSecretKey,
    });

    console.log(`POST /api/billing/webhook -> ${status}`);
    console.log(JSON.stringify(body, null, 2));

    const billing = await prisma.tenantBilling.findUnique({
      where: { tenantSlug: ACTIVATION_SLUG },
    });
    const tenant = await prisma.tenant.findUnique({
      where: { slug: ACTIVATION_SLUG },
      select: { id: true },
    });
    const audit = tenant
      ? await prisma.auditLog.findFirst({
          where: { tenantId: tenant.id, action: "STRIPE_PAYMENT_INTENT_BILLING_ACTIVE" },
          orderBy: { createdAt: "desc" },
          select: { action: true, justification: true },
        })
      : null;

    console.log("\n--- Database verification ---");
    console.log("billing:", billing);
    console.log("audit:", audit);

    if (status !== 200 || billing?.status !== TENANT_BILLING_STATUS.ACTIVE) {
      console.error("\nBilling activation smoke FAILED.");
      process.exitCode = 1;
      return;
    }

    console.log(`\nBilling activation smoke PASSED for slug "${ACTIVATION_SLUG}".`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
