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

const BWC_SLUG = "bwc";
const BWC_OPERATOR_EMAIL =
  process.env.E2E_BWC_OPERATOR_EMAIL?.trim().toLowerCase() ||
  "wil@blackwoodscoffee.com";

/**
 * Epic 17 — design-partner billing gate on a live provisioned tenant.
 * Path B: payment_intent.succeeded flips PENDING → ACTIVE without re-provisioning.
 */
test.describe.configure({ mode: "serial" });

test.describe("BWC billing gate — PENDING hold to checkout activation", () => {
  test.beforeAll(async () => {
    test.skip(!hasDatabaseUrl(), "DATABASE_URL is required for billing gate E2E.");
    test.skip(!hasStripeWebhookSecrets(), "STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET required.");
    test.skip(!hasSupabaseAdmin(), "SUPABASE_SERVICE_ROLE_KEY required for tenant session.");
    await ensureTenantBillingPending(BWC_SLUG);
  });

  test.afterAll(async () => {
    await disconnectE2ePrisma();
  });

  test("blocks dashboard while PENDING, then clears after payment_intent.succeeded", async ({
    page,
    request,
  }) => {
    await redeemInviteOnTenantSubdomain(page, BWC_OPERATOR_EMAIL, BWC_SLUG);

    const gatedPaths = [
      `${tenantSubdomainOrigin(BWC_SLUG)}/`,
      `${tenantSubdomainOrigin(BWC_SLUG)}/board-report`,
    ];

    for (const gatedPath of gatedPaths) {
      await page.goto(gatedPath, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });

      await expect(page.getByRole("heading", { name: /Workspace access paused/i })).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByText(new RegExp(BWC_SLUG, "i"))).toBeVisible();
      await expect(page.getByText(/PENDING/i)).toBeVisible();
    }

    const event = buildPaymentIntentSucceededEvent({
      tenantSlug: BWC_SLUG,
      stripeCustomerId: manualStripeCustomerIdForSlug(BWC_SLUG),
      amountReceivedCents: 4_999_00,
    });

    const webhook = await postSignedBillingWebhook(request, event);
    expect(webhook.status, JSON.stringify(webhook.body)).toBe(200);
    expect(webhook.body.tenantSlug).toBe(BWC_SLUG);

    await assertTenantBillingActive(BWC_SLUG);

    await page.goto(`${tenantSubdomainOrigin(BWC_SLUG)}/`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByRole("heading", { name: /Workspace access paused/i })).toBeHidden({
      timeout: 20_000,
    });
    await expect(page.getByTestId("dashboard-main")).toBeVisible({ timeout: 20_000 });
  });
});
