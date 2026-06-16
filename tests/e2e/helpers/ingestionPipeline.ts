import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import type { APIRequestContext, Page } from "@playwright/test";
import Stripe from "stripe";
import dotenv from "dotenv";

import { TENANT_BILLING_STATUS } from "@/app/lib/billing/constants";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

export const LOCAL_APP_ORIGIN = "http://127.0.0.1:3000";
export const PILOT_CORP_SLUG = "pilot-corp";

let prismaSingleton: PrismaClient | null = null;

export function getE2ePrisma(): PrismaClient {
  if (!prismaSingleton) {
    prismaSingleton = new PrismaClient();
  }
  return prismaSingleton;
}

export async function disconnectE2ePrisma(): Promise<void> {
  if (prismaSingleton) {
    await prismaSingleton.$disconnect();
    prismaSingleton = null;
  }
}

export function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function hasStripeWebhookSecrets(): boolean {
  return Boolean(
    process.env.STRIPE_WEBHOOK_SECRET?.trim() && process.env.STRIPE_SECRET_KEY?.trim(),
  );
}

export function hasSupabaseAdmin(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

export function tenantSubdomainOrigin(slug: string): string {
  return `http://${slug}.lvh.me:3000`;
}

export function uniquePilotBuyerEmail(): string {
  return `pilot-buyer+e2e.${Date.now()}@ironframe.test`;
}

export async function cleanupPilotCorpFixture(): Promise<void> {
  const db = getE2ePrisma();
  const tenant = await db.tenant.findUnique({
    where: { slug: PILOT_CORP_SLUG },
    select: { id: true },
  });

  if (tenant) {
    await db.userRoleAssignment.deleteMany({ where: { tenantId: tenant.id } });
    await db.tenant.delete({ where: { id: tenant.id } });
  }

  await db.tenantBilling.deleteMany({ where: { tenantSlug: PILOT_CORP_SLUG } });
  await db.prospect.deleteMany({ where: { slug: PILOT_CORP_SLUG } });
}

export function buildCheckoutSessionCompletedEvent(input: {
  email: string;
  slug: string;
  companyName: string;
  amountTotalCents: number;
  stripeCustomerId: string;
  checkoutSessionId: string;
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
    },
  } as Stripe.Checkout.Session;

  return {
    id: `evt_e2e_${Date.now()}`,
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

export function signStripeWebhookPayload(payload: string): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret || !key) {
    throw new Error("STRIPE_WEBHOOK_SECRET and STRIPE_SECRET_KEY are required.");
  }
  const stripe = new Stripe(key);
  return stripe.webhooks.generateTestHeaderString({ payload, secret });
}

export async function postSignedStripeWebhook(
  request: APIRequestContext,
  event: Stripe.Event,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const payload = JSON.stringify(event);
  const signature = signStripeWebhookPayload(payload);
  const response = await request.post(`${LOCAL_APP_ORIGIN}/api/webhooks/stripe`, {
    headers: {
      "stripe-signature": signature,
      "content-type": "application/json",
    },
    data: payload,
  });
  const body = (await response.json()) as Record<string, unknown>;
  return { status: response.status(), body };
}

export async function assertTenantBillingActive(slug: string): Promise<void> {
  const billing = await getE2ePrisma().tenantBilling.findUnique({
    where: { tenantSlug: slug },
  });
  if (!billing) {
    throw new Error(`TenantBilling row missing for slug "${slug}".`);
  }
  if (billing.status !== TENANT_BILLING_STATUS.ACTIVE) {
    throw new Error(`Expected ACTIVE billing for "${slug}", got ${billing.status}.`);
  }
}

export async function redeemInviteOnTenantSubdomain(
  page: Page,
  email: string,
  tenantSlug: string,
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase admin credentials are required for invite redemption.");
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const redirectTo = `${tenantSubdomainOrigin(tenantSlug)}/api/auth/callback`;
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });

  if (error) {
    throw new Error(`Supabase generateLink failed: ${error.message}`);
  }

  const actionLink = data.properties?.action_link;
  if (!actionLink) {
    throw new Error("Supabase generateLink returned no action_link.");
  }

  await page.goto(actionLink, { waitUntil: "domcontentloaded", timeout: 60_000 });

  if (page.url().includes("/legal/accept")) {
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /Accept and continue/i }).click();
    await page.waitForURL((url) => !url.pathname.includes("/legal/accept"), { timeout: 30_000 });
  }
}
