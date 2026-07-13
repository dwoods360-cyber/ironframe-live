/**
 * Seeds a fresh stripe-e2e-corp invitation and fires a signed checkout.session.completed
 * webhook against the local provision route (Path A smoke fixture).
 *
 * Usage: npm run smoke:stripe-e2e:provision [-- --reset]
 */
import { createHash, randomBytes } from "node:crypto";
import { resolve } from "node:path";

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

import { loadStripeSmokeEnv, resolveInstantWebhookSecret } from "./stripeSmokeEnv";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

export const STRIPE_E2E_PROVISION_SLUG = "stripe-e2e-corp";
const LOCAL_APP_ORIGIN = (process.env.LOCAL_APP_ORIGIN ?? "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const WORKSPACE_INVITATION_STATUS_ACTIVE = "ACTIVE";

function hashWorkspaceInvitationToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

function generateWorkspaceInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

function buildCheckoutSessionCompletedEvent(input: {
  email: string;
  slug: string;
  companyName: string;
  amountTotalCents: number;
  stripeCustomerId: string;
  checkoutSessionId: string;
  invitationToken: string;
}): Stripe.Event {
  const session = {
    id: input.checkoutSessionId,
    object: "checkout.session",
    amount_total: input.amountTotalCents,
    customer: input.stripeCustomerId,
    customer_details: { email: input.email },
    metadata: {
      slug: input.slug,
      companyName: input.companyName,
      invitationToken: input.invitationToken,
    },
  } as Stripe.Checkout.Session;

  return {
    id: `evt_stripe_e2e_provision_${Date.now()}`,
    object: "event",
    api_version: "2024-11-20.acacia",
    created: Math.floor(Date.now() / 1000),
    type: "checkout.session.completed",
    livemode: false,
    pending_webhooks: 0,
    request: null,
    data: { object: session },
  } as Stripe.Event;
}

async function cleanupStripeE2eProvisionFixture(prisma: PrismaClient): Promise<void> {
  await prisma.tenantWorkspaceInvitation.deleteMany({
    where: { tenantSlug: STRIPE_E2E_PROVISION_SLUG },
  });
  const tenant = await prisma.tenant.findUnique({
    where: { slug: STRIPE_E2E_PROVISION_SLUG },
    select: { id: true },
  });
  if (tenant) {
    await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
  }
  await prisma.tenantBilling.deleteMany({ where: { tenantSlug: STRIPE_E2E_PROVISION_SLUG } });
  await prisma.prospect.deleteMany({ where: { slug: STRIPE_E2E_PROVISION_SLUG } });
}

async function seedStripeE2eProvisionInvitation(prisma: PrismaClient): Promise<string> {
  const token = generateWorkspaceInvitationToken();
  await prisma.tenantWorkspaceInvitation.deleteMany({
    where: { tenantSlug: STRIPE_E2E_PROVISION_SLUG },
  });
  await prisma.tenantWorkspaceInvitation.create({
    data: {
      tokenHash: hashWorkspaceInvitationToken(token),
      tenantSlug: STRIPE_E2E_PROVISION_SLUG,
      status: WORKSPACE_INVITATION_STATUS_ACTIVE,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdByOperator: "STRIPE_E2E_PROVISION_SMOKE",
    },
  });
  return token;
}

async function main(): Promise<void> {
  loadStripeSmokeEnv();
  const webhookSecret = resolveInstantWebhookSecret();
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!webhookSecret || !stripeSecretKey) {
    throw new Error(
      "STRIPE_INSTANT_CHECKOUT_WEBHOOK_SECRET (or STRIPE_WEBHOOK_SECRET) and STRIPE_SECRET_KEY are required in .env.local",
    );
  }

  const prisma = new PrismaClient();
  try {
    const resetFixture = process.argv.includes("--reset");
    if (resetFixture) {
      console.log(`Resetting prior "${STRIPE_E2E_PROVISION_SLUG}" fixture rows...`);
      await cleanupStripeE2eProvisionFixture(prisma);
    }

    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: STRIPE_E2E_PROVISION_SLUG },
      select: { id: true },
    });
    if (existingTenant) {
      throw new Error(
        `Tenant "${STRIPE_E2E_PROVISION_SLUG}" already exists. Re-run with --reset to replace the dev fixture.`,
      );
    }

    const invitationToken = await seedStripeE2eProvisionInvitation(prisma);
    const email =
      process.env.STRIPE_E2E_BUYER_EMAIL?.trim() ||
      `stripee2ebuyer${Date.now()}@gmail.com`;
    const event = buildCheckoutSessionCompletedEvent({
      email,
      slug: STRIPE_E2E_PROVISION_SLUG,
      companyName: "Stripe E2E Corp",
      amountTotalCents: 50_000,
      stripeCustomerId: `cus_stripe_e2e_${Date.now()}`,
      checkoutSessionId: `cs_stripe_e2e_${Date.now()}`,
      invitationToken,
    });

    const payload = JSON.stringify(event);
    const stripe = new Stripe(stripeSecretKey);
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });

    const response = await fetch(`${LOCAL_APP_ORIGIN}/api/webhooks/stripe`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": signature,
      },
      body: payload,
    });
    const body = (await response.json()) as Record<string, unknown>;

    console.log(`POST /api/webhooks/stripe -> ${response.status}`);
    console.log(JSON.stringify(body, null, 2));

    const tenant = await prisma.tenant.findUnique({
      where: { slug: STRIPE_E2E_PROVISION_SLUG },
      select: { id: true, slug: true, ale_baseline: true },
    });
    const invite = await prisma.tenantWorkspaceInvitation.findFirst({
      where: { tenantSlug: STRIPE_E2E_PROVISION_SLUG },
      select: { status: true, consumedAt: true },
    });
    const billing = await prisma.tenantBilling.findUnique({
      where: { tenantSlug: STRIPE_E2E_PROVISION_SLUG },
    });
    const audit = await prisma.auditLog.findMany({
      where: { tenantId: tenant?.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { action: true, justification: true },
    });

    console.log("\n--- Database verification ---");
    console.log(
      "tenant:",
      tenant ? { ...tenant, ale_baseline: tenant.ale_baseline.toString() } : null,
    );
    console.log("invitation:", invite);
    console.log("billing:", billing);
    console.log("recent audit:", audit);

    const coreProvisioned =
      Boolean(tenant) &&
      Boolean(billing && billing.status === "ACTIVE") &&
      Boolean(invite?.consumedAt);

    if (!response.ok && !coreProvisioned) {
      process.exitCode = 1;
      return;
    }

    if (!response.ok && coreProvisioned) {
      console.warn(
        "\nProvision core succeeded (tenant + billing + invitation consumed).",
      );
      console.warn(
        `Supabase invite step failed (${String(body.error ?? "unknown")}) — expected on rate-limited dev projects.`,
      );
    } else if (!coreProvisioned) {
      console.error("\nProvision smoke incomplete — check dev server logs.");
      process.exitCode = 1;
      return;
    } else {
      console.log("\nStripe E2E provision smoke PASSED.");
    }

    console.log(
      `Audit UI: ${LOCAL_APP_ORIGIN}/boardroom/admin/audit-logs?tenant=${STRIPE_E2E_PROVISION_SLUG}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
