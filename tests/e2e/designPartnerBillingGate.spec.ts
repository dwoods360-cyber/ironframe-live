import { test, expect } from "@playwright/test";

import { manualStripeCustomerIdForSlug } from "@/app/lib/billing/constants";
import {
  assertTenantBillingActive,
  buildPaymentIntentSucceededEvent,
  disconnectE2ePrisma,
  ensureTenantBillingPending,
  hasDatabaseUrl,
  hasStripeWebhookSecrets,
  hasSupabaseAdmin,
  postSignedBillingWebhook,
  redeemInviteOnTenantSubdomain,
  tenantSubdomainOrigin,
} from "./helpers/ingestionPipeline";
import { LOCAL_BILLING_GATE_SLUG } from "./helpers/designPartnerE2eEnv";

const OPERATOR_EMAIL =
  process.env.E2E_BILLING_GATE_OPERATOR_EMAIL?.trim().toLowerCase() ||
  process.env.E2E_PRODUCTION_OPERATOR_EMAIL?.trim().toLowerCase() ||
  "";

/**
 * Epic 17 — billing gate on the local stripe-act-b1 fixture tenant.
 * Path B: payment_intent.succeeded flips PENDING → ACTIVE without re-provisioning.
 */
test.describe.configure({ mode: "serial" });

test.describe("Design partner billing gate — PENDING hold to checkout activation", () => {
  test.beforeAll(async () => {
    test.skip(!hasDatabaseUrl(), "DATABASE_URL is required for billing gate E2E.");
    test.skip(!hasStripeWebhookSecrets(), "STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET required.");
    test.skip(!hasSupabaseAdmin(), "SUPABASE_SERVICE_ROLE_KEY required for tenant session.");
    test.skip(!OPERATOR_EMAIL, "Set E2E_BILLING_GATE_OPERATOR_EMAIL for billing gate E2E.");
    await ensureTenantBillingPending(LOCAL_BILLING_GATE_SLUG);
  });

  test.afterAll(async () => {
    await disconnectE2ePrisma();
  });

  test("blocks dashboard while PENDING, then clears after payment_intent.succeeded", async ({
    page,
    request,
  }) => {
    await redeemInviteOnTenantSubdomain(page, OPERATOR_EMAIL, LOCAL_BILLING_GATE_SLUG);

    const gatedPaths = [
      `${tenantSubdomainOrigin(LOCAL_BILLING_GATE_SLUG)}/`,
      `${tenantSubdomainOrigin(LOCAL_BILLING_GATE_SLUG)}/board-report`,
    ];

    for (const gatedPath of gatedPaths) {
      await page.goto(gatedPath, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });

      await expect(page.getByRole("heading", { name: /Workspace access paused/i })).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByText(new RegExp(LOCAL_BILLING_GATE_SLUG, "i"))).toBeVisible();
      await expect(page.getByText(/PENDING/i)).toBeVisible();
    }

    const event = buildPaymentIntentSucceededEvent({
      tenantSlug: LOCAL_BILLING_GATE_SLUG,
      stripeCustomerId: manualStripeCustomerIdForSlug(LOCAL_BILLING_GATE_SLUG),
      amountReceivedCents: 4_999_00,
    });

    const webhook = await postSignedBillingWebhook(request, event);
    expect(webhook.status, JSON.stringify(webhook.body)).toBe(200);
    expect(webhook.body.tenantSlug).toBe(LOCAL_BILLING_GATE_SLUG);

    await assertTenantBillingActive(LOCAL_BILLING_GATE_SLUG);

    await page.goto(`${tenantSubdomainOrigin(LOCAL_BILLING_GATE_SLUG)}/`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByRole("heading", { name: /Workspace access paused/i })).toBeHidden({
      timeout: 20_000,
    });
    await expect(page.getByTestId("dashboard-main")).toBeVisible({ timeout: 20_000 });
  });
});
