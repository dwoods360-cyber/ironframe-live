import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { PrismaClient, UserRole } from "@prisma/client";
import type { APIRequestContext, Page } from "@playwright/test";
import Stripe from "stripe";
import dotenv from "dotenv";

import {
  manualStripeCustomerIdForSlug,
  TENANT_BILLING_STATUS,
} from "@/app/lib/billing/constants";
import {
  generateWorkspaceInvitationToken,
  hashWorkspaceInvitationToken,
  WORKSPACE_INVITATION_STATUS,
} from "@/app/utils/invitation-core";

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

export function isE2eProductionTarget(): boolean {
  return (
    process.env.E2E_PRODUCTION === "1" ||
    process.env.PLAYWRIGHT_TARGET?.trim().toLowerCase() === "production"
  );
}

export function tenantSubdomainOrigin(slug: string): string {
  const explicit = process.env.E2E_TENANT_ORIGIN?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  if (isE2eProductionTarget()) {
    const apex = process.env.E2E_TENANT_APEX_DOMAIN?.trim() || "ironframegrc.com";
    return `https://${slug.toLowerCase()}.${apex}`;
  }

  return `http://${slug}.lvh.me:3000`;
}

function tenantCookieDomain(tenantSlug: string): string {
  return new URL(tenantSubdomainOrigin(tenantSlug)).hostname;
}

function tenantAuthCallbackUrl(tenantSlug: string): string {
  return `${tenantSubdomainOrigin(tenantSlug)}/api/auth/callback?next=${encodeURIComponent("/")}`;
}

/** Supabase dashboard Site URL may point at Vercel — rewrite verify links for local lvh.me E2E. */
export function localizeSupabaseActionLink(actionLink: string, tenantSlug: string): string {
  const redirectTo = tenantAuthCallbackUrl(tenantSlug);
  try {
    const url = new URL(actionLink);
    if (url.searchParams.has("redirect_to")) {
      url.searchParams.set("redirect_to", redirectTo);
    }
    return url.toString();
  } catch {
    return actionLink;
  }
}

function userIdFromAccessToken(accessToken: string): string {
  const segment = accessToken.split(".")[1];
  if (!segment) {
    throw new Error("Malformed Supabase access_token.");
  }
  const payload = JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as { sub?: string };
  if (!payload.sub?.trim()) {
    throw new Error("Supabase access_token missing sub claim.");
  }
  return payload.sub;
}

async function ensureTenantRoleAssignment(userId: string, tenantSlug: string): Promise<string> {
  const tenant = await getE2ePrisma().tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) {
    throw new Error(`Tenant "${tenantSlug}" not found for RBAC bootstrap.`);
  }

  const existing = await getE2ePrisma().userRoleAssignment.findFirst({
    where: { userId, tenantId: tenant.id },
    select: { id: true },
  });
  if (!existing) {
    await getE2ePrisma().userRoleAssignment.create({
      data: { userId, tenantId: tenant.id, role: UserRole.GRC_MANAGER },
    });
  }

  return tenant.id;
}

async function completeLegalAcceptIfPresent(page: Page): Promise<void> {
  if (!page.url().includes("/legal/accept")) return;
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Accept and continue/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/legal/accept"), { timeout: 30_000 });
}

async function materializeSupabaseAuthCookies(
  accessToken: string,
  refreshToken: string,
): Promise<Array<{ name: string; value: string; options: Record<string, unknown> }>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.");
  }

  const pending: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return pending.map(({ name, value }) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          const existing = pending.findIndex((row) => row.name === cookie.name);
          const row = { name: cookie.name, value: cookie.value, options: cookie.options ?? {} };
          if (existing >= 0) {
            pending[existing] = row;
          } else {
            pending.push(row);
          }
        }
      },
    },
  });

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) {
    throw new Error(`Supabase setSession failed: ${error.message}`);
  }

  return pending;
}

/**
 * When Supabase rejects redirect_to, verification completes on supabase.co with hash tokens.
 * Bootstrap a tenant-scoped browser session without relying on the hosted Site URL.
 */
async function bootstrapImplicitTenantSession(
  page: Page,
  tenantSlug: string,
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  const userId = userIdFromAccessToken(accessToken);
  const tenantUuid = await ensureTenantRoleAssignment(userId, tenantSlug);
  const tenantOrigin = tenantSubdomainOrigin(tenantSlug);
  const cookieDomain = tenantCookieDomain(tenantSlug);
  const cookieSecure = tenantOrigin.startsWith("https:");
  const authCookies = await materializeSupabaseAuthCookies(accessToken, refreshToken);

  const normalizeSameSite = (value: unknown): "Lax" | "Strict" | "None" => {
    if (value === "strict" || value === "Strict") return "Strict";
    if (value === "none" || value === "None") return "None";
    return "Lax";
  };

  await page.context().addCookies([
    ...authCookies.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookieDomain,
      path: typeof cookie.options.path === "string" ? cookie.options.path : "/",
      httpOnly: Boolean(cookie.options.httpOnly),
      secure: cookieSecure,
      sameSite: normalizeSameSite(cookie.options.sameSite),
    })),
    {
      name: "ironframe-tenant",
      value: tenantUuid,
      domain: cookieDomain,
      path: "/",
      httpOnly: false,
      secure: cookieSecure,
      sameSite: "Lax",
    },
  ]);

  await page.goto(`${tenantOrigin}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await completeLegalAcceptIfPresent(page);
}

export function uniquePilotBuyerEmail(): string {
  return `pilotbuyer.e2e.${Date.now()}@gmail.com`;
}

export async function seedPilotCorpInvitationToken(slug: string): Promise<string> {
  const token = generateWorkspaceInvitationToken();
  const db = getE2ePrisma();
  await db.tenantWorkspaceInvitation.deleteMany({
    where: { tenantSlug: slug },
  });
  await db.tenantWorkspaceInvitation.create({
    data: {
      tokenHash: hashWorkspaceInvitationToken(token),
      tenantSlug: slug,
      status: WORKSPACE_INVITATION_STATUS.ACTIVE,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdByOperator: "E2E_PIPELINE",
    },
  });
  return token;
}

export async function cleanupPilotCorpFixture(): Promise<void> {
  const db = getE2ePrisma();
  await db.tenantWorkspaceInvitation.deleteMany({ where: { tenantSlug: PILOT_CORP_SLUG } });
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
  invitationToken?: string;
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
      ...(input.invitationToken ? { invitationToken: input.invitationToken } : {}),
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

export function buildPaymentIntentSucceededEvent(input: {
  tenantSlug: string;
  stripeCustomerId?: string;
  amountReceivedCents?: number;
  paymentIntentId?: string;
}): Stripe.Event {
  const tenantSlug = input.tenantSlug.trim().toLowerCase();
  const paymentIntent = {
    id: input.paymentIntentId ?? `pi_e2e_${Date.now()}`,
    object: "payment_intent",
    amount_received: input.amountReceivedCents ?? 4_999_00,
    customer: input.stripeCustomerId ?? manualStripeCustomerIdForSlug(tenantSlug),
    metadata: {
      tenant_slug: tenantSlug,
    },
  } as Stripe.PaymentIntent;

  return {
    id: `evt_pi_e2e_${Date.now()}`,
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

/** Path B — flip existing tenant billing PENDING → ACTIVE via production revenue webhook. */
export async function postSignedBillingWebhook(
  request: APIRequestContext,
  event: Stripe.Event,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const payload = JSON.stringify(event);
  const signature = signStripeWebhookPayload(payload);
  const response = await request.post(`${LOCAL_APP_ORIGIN}/api/billing/webhook`, {
    headers: {
      "stripe-signature": signature,
      "content-type": "application/json",
    },
    data: payload,
  });
  const body = (await response.json()) as Record<string, unknown>;
  return { status: response.status(), body };
}

export async function ensureTenantBillingPending(slug: string): Promise<void> {
  const tenantSlug = slug.trim().toLowerCase();
  await getE2ePrisma().tenantBilling.upsert({
    where: { tenantSlug },
    create: {
      tenantSlug,
      stripeCustomerId: manualStripeCustomerIdForSlug(tenantSlug),
      status: TENANT_BILLING_STATUS.PENDING,
    },
    update: { status: TENANT_BILLING_STATUS.PENDING },
  });
}

/** Dev Supabase projects often rate-limit `inviteUserByEmail` after repeated smoke runs. */
export function isSupabaseInviteRateLimitError(
  status: number,
  body: Record<string, unknown>,
): boolean {
  return (
    status === 500 &&
    typeof body.error === "string" &&
    /email rate limit/i.test(body.error)
  );
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

async function exchangeMagicLinkForSession(
  email: string,
  linkProperties: { email_otp?: string | null; hashed_token?: string | null },
): Promise<{ accessToken: string; refreshToken: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.");
  }

  const attempts: Record<string, string>[] = [];
  const hashedToken = linkProperties.hashed_token?.trim();
  const emailOtp = linkProperties.email_otp?.trim();
  if (hashedToken) {
    attempts.push({ type: "magiclink", token_hash: hashedToken });
    attempts.push({ type: "email", token_hash: hashedToken });
  }
  if (emailOtp) {
    attempts.push({ type: "magiclink", email, token: emailOtp });
    attempts.push({ type: "email", email, token: emailOtp });
  }

  let lastError = "no verification token returned";
  for (const body of attempts) {
    const response = await fetch(`${supabaseUrl}/auth/v1/verify`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      error_description?: string;
      msg?: string;
    };

    if (response.ok && payload.access_token && payload.refresh_token) {
      return { accessToken: payload.access_token, refreshToken: payload.refresh_token };
    }

    lastError = payload.error_description ?? payload.msg ?? `HTTP ${response.status}`;
  }

  throw new Error(`Supabase magic-link verify failed: ${lastError}`);
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

  const redirectTo = tenantAuthCallbackUrl(tenantSlug);
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo,
      data: { tenant_slug: tenantSlug },
    },
  });

  if (error) {
    throw new Error(`Supabase generateLink failed: ${error.message}`);
  }

  const emailOtp = data.properties?.email_otp?.trim();
  const hashedToken = data.properties?.hashed_token?.trim();
  if (emailOtp || hashedToken) {
    const { accessToken, refreshToken } = await exchangeMagicLinkForSession(email, data.properties);
    await bootstrapImplicitTenantSession(page, tenantSlug, accessToken, refreshToken);
    return;
  }

  const actionLink = hashedToken
    ? `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(hashedToken)}&type=magiclink&redirect_to=${encodeURIComponent(redirectTo)}`
    : data.properties?.action_link;

  if (!actionLink) {
    throw new Error("Supabase generateLink returned no verification link.");
  }

  await page.goto(localizeSupabaseActionLink(actionLink, tenantSlug), {
    waitUntil: "networkidle",
    timeout: 60_000,
  });

  const landed = page.url();
  if (landed.includes("supabase.co") && landed.includes("#")) {
    const hash = landed.slice(landed.indexOf("#") + 1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (accessToken && refreshToken) {
      await bootstrapImplicitTenantSession(page, tenantSlug, accessToken, refreshToken);
      return;
    }
  }

  await page.waitForURL(new RegExp(`${tenantSlug}\\.lvh\\.me:3000`), { timeout: 30_000 }).catch(() => undefined);
  await completeLegalAcceptIfPresent(page);
}
