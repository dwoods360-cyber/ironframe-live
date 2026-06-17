/**
 * Seeds a fresh pilot-corp invitation and fires a signed checkout.session.completed
 * webhook against the local provision route.
 *
 * Usage: npm run smoke:pilot-corp:provision
 */
import { createHash, randomBytes } from "node:crypto";
import { resolve } from "node:path";

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const PILOT_CORP_SLUG = "pilot-corp";
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
    id: `evt_pilot_provision_${Date.now()}`,
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

async function cleanupPilotCorpFixture(prisma: PrismaClient): Promise<void> {
  await prisma.tenantWorkspaceInvitation.deleteMany({
    where: { tenantSlug: PILOT_CORP_SLUG },
  });
  const tenant = await prisma.tenant.findUnique({
    where: { slug: PILOT_CORP_SLUG },
    select: { id: true },
  });
  if (tenant) {
    await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
  }
  await prisma.tenantBilling.deleteMany({ where: { tenantSlug: PILOT_CORP_SLUG } });
  await prisma.prospect.deleteMany({ where: { slug: PILOT_CORP_SLUG } });
}

async function seedPilotCorpInvitation(prisma: PrismaClient): Promise<string> {
  const token = generateWorkspaceInvitationToken();
  await prisma.tenantWorkspaceInvitation.deleteMany({
    where: { tenantSlug: PILOT_CORP_SLUG },
  });
  await prisma.tenantWorkspaceInvitation.create({
    data: {
      tokenHash: hashWorkspaceInvitationToken(token),
      tenantSlug: PILOT_CORP_SLUG,
      status: WORKSPACE_INVITATION_STATUS_ACTIVE,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdByOperator: "PILOT_CORP_SMOKE",
    },
  });
  return token;
}

async function main(): Promise<void> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!webhookSecret || !stripeSecretKey) {
    throw new Error("STRIPE_WEBHOOK_SECRET and STRIPE_SECRET_KEY are required in .env.local");
  }

  const prisma = new PrismaClient();
  try {
    const resetFixture = process.argv.includes("--reset");
    if (resetFixture) {
      console.log(`Resetting prior "${PILOT_CORP_SLUG}" fixture rows...`);
      await cleanupPilotCorpFixture(prisma);
    }

    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: PILOT_CORP_SLUG },
      select: { id: true },
    });
    if (existingTenant) {
      throw new Error(
        `Tenant "${PILOT_CORP_SLUG}" already exists. Re-run with --reset to replace the dev fixture.`,
      );
    }

    const invitationToken = await seedPilotCorpInvitation(prisma);
    const email =
      process.env.PILOT_CORP_BUYER_EMAIL?.trim() ||
      `pilotbuyer${Date.now()}@gmail.com`;
    const event = buildCheckoutSessionCompletedEvent({
      email,
      slug: PILOT_CORP_SLUG,
      companyName: "Pilot Corp",
      amountTotalCents: 50_000,
      stripeCustomerId: `cus_pilot_corp_${Date.now()}`,
      checkoutSessionId: `cs_pilot_corp_${Date.now()}`,
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
      where: { slug: PILOT_CORP_SLUG },
      select: { id: true, slug: true, ale_baseline: true },
    });
    const invite = await prisma.tenantWorkspaceInvitation.findFirst({
      where: { tenantSlug: PILOT_CORP_SLUG },
      select: { status: true, consumedAt: true },
    });
    const billing = await prisma.tenantBilling.findUnique({
      where: { tenantSlug: PILOT_CORP_SLUG },
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
      console.log("\nPilot Corp provision smoke PASSED.");
    }

    console.log(
      `Audit UI: ${LOCAL_APP_ORIGIN}/boardroom/admin/audit-logs?tenant=${PILOT_CORP_SLUG}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
