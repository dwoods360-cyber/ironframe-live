import { test, expect } from "@playwright/test";

import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import { waitForDashboardReady } from "./helpers/dashboardGate";
import {
  LOCAL_APP_ORIGIN,
  STRIPE_E2E_PROVISION_SLUG,
  assertTenantBillingActive,
  isSupabaseInviteRateLimitError,
  buildCheckoutSessionCompletedEvent,
  cleanupStripeE2eProvisionFixture,
  disconnectE2ePrisma,
  getE2ePrisma,
  hasDatabaseUrl,
  hasStripeWebhookSecrets,
  hasSupabaseAdmin,
  postSignedStripeWebhook,
  redeemInviteOnTenantSubdomain,
  seedStripeE2eInvitationToken,
  tenantSubdomainOrigin,
  uniquePilotBuyerEmail,
} from "./helpers/ingestionPipeline";

/**
 * End-to-end verification of the invite-only sales funnel and Stripe async provisioning tunnel.
 *
 * Prerequisites (local):
 * - `DATABASE_URL` — Prisma assertions against `prospects`, `Tenant`, `tenant_billing`
 * - `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` — cryptographically signed webhook POST
 * - `SUPABASE_SERVICE_ROLE_KEY` — invite redemption via magic link (blocks 3–4)
 * - Dev server on localhost:3000 (Playwright webServer) and `*.lvh.me` → 127.0.0.1
 */
test.describe.serial("Ingestion pipeline — public lead, Stripe webhook, subdomain isolation", () => {
  const leadRunId = Date.now();
  const leadOrgName = `E2E Lead Org ${leadRunId}`;
  const leadEmail = `lead+e2e.${leadRunId}@ironframe.test`;
  const leadAleDollars = "11,100,000";
  const expectedLeadAleCents = 1_110_000_000n;

  let stripeE2eBuyerEmail = "";
  let stripeE2eTenantUuid = "";

  test.beforeAll(async () => {
    test.skip(!hasDatabaseUrl(), "DATABASE_URL is required for ingestion pipeline E2E.");
    await cleanupStripeE2eProvisionFixture();
  });

  test.afterAll(async () => {
    await disconnectE2ePrisma();
  });

  test("Block 1 — public lead capture commits BigInt ALE to prospects", async ({ page }) => {
    await page.goto(`${LOCAL_APP_ORIGIN}/register/contact`);

    await page.getByLabel(/Work email/i).fill(leadEmail);
    await page.getByLabel(/Organization/i).fill(leadOrgName);
    await page.getByLabel(/Estimated annual loss exposure/i).fill(leadAleDollars);
    await page.getByLabel(/Full name/i).fill("E2E Lead Tester");

    const [leadResponse] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/register/public-lead") &&
          res.request().method() === "POST",
        { timeout: 30_000 },
      ),
      page.getByRole("button", { name: /Contact sales/i }).click(),
    ]);

    expect(leadResponse.ok(), await leadResponse.text()).toBe(true);

    await expect(
      page.getByText(/request has been recorded in the executive lead ledger/i),
    ).toBeVisible({ timeout: 10_000 });

    const prospect = await getE2ePrisma().prospect.findFirst({
      where: { email: leadEmail },
      orderBy: { createdAt: "desc" },
    });

    expect(prospect).not.toBeNull();
    expect(prospect!.orgName).toBe(leadOrgName);
    expect(prospect!.reportedAle).toBe(expectedLeadAleCents);
  });

  test("Block 2 — signed Stripe webhook provisions tenant and ACTIVE billing", async ({
    request,
  }) => {
    test.skip(!hasStripeWebhookSecrets(), "STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET required.");
    test.skip(!hasSupabaseAdmin(), "SUPABASE_SERVICE_ROLE_KEY required for invite provisioning.");

    stripeE2eBuyerEmail = uniquePilotBuyerEmail();
    const stripeCustomerId = `cus_e2e_${leadRunId}`;
    const checkoutSessionId = `cs_e2e_${leadRunId}`;
    const invitationToken = await seedStripeE2eInvitationToken(STRIPE_E2E_PROVISION_SLUG);

    const event = buildCheckoutSessionCompletedEvent({
      email: stripeE2eBuyerEmail,
      slug: STRIPE_E2E_PROVISION_SLUG,
      companyName: "Stripe E2E Corp",
      amountTotalCents: 4_999_00,
      stripeCustomerId,
      checkoutSessionId,
      invitationToken,
    });

    const { status, body } = await postSignedStripeWebhook(request, event);

    const inviteEmailRateLimited = isSupabaseInviteRateLimitError(status, body);
    const inviteDeferredSuccess =
      status === 200 && body.status === "SUCCESS" && body.invitePending === true;
    if (!inviteEmailRateLimited && !inviteDeferredSuccess) {
      expect(status, JSON.stringify(body)).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.tenantSlug).toBe(STRIPE_E2E_PROVISION_SLUG);
      expect(body.email).toBe(stripeE2eBuyerEmail);
    }

    if (inviteDeferredSuccess) {
      expect(body.message).toMatch(/Tenant and billing initialized/i);
    }

    const tenant = await getE2ePrisma().tenant.findUnique({
      where: { slug: STRIPE_E2E_PROVISION_SLUG },
    });
    expect(tenant, JSON.stringify(body)).not.toBeNull();
    expect(tenant!.name).toBe("Stripe E2E Corp");
    stripeE2eTenantUuid = tenant!.id;

    await assertTenantBillingActive(STRIPE_E2E_PROVISION_SLUG);

    const invitation = await getE2ePrisma().tenantWorkspaceInvitation.findFirst({
      where: { tenantSlug: STRIPE_E2E_PROVISION_SLUG },
      orderBy: { createdAt: "desc" },
      select: { consumedAt: true },
    });
    expect(invitation?.consumedAt, "invitation gate must be consumed after provision").toBeTruthy();

    const prospect = await getE2ePrisma().prospect.findUnique({
      where: { slug: STRIPE_E2E_PROVISION_SLUG },
    });
    expect(prospect).not.toBeNull();
    expect(prospect!.reportedAle).toBe(499_900n);
  });

  test("Block 3 — invite redemption lands on tenant subdomain Command Post", async ({ page }) => {
    test.skip(!stripeE2eBuyerEmail, "Block 2 must provision stripe-e2e-corp first.");
    test.skip(!hasSupabaseAdmin(), "SUPABASE_SERVICE_ROLE_KEY required.");

    await redeemInviteOnTenantSubdomain(page, stripeE2eBuyerEmail, STRIPE_E2E_PROVISION_SLUG);

    await expect(page).toHaveURL(new RegExp(`${STRIPE_E2E_PROVISION_SLUG}\\.lvh\\.me:3000`), {
      timeout: 30_000,
    });

    const mode = await waitForDashboardReady(page);
    expect(mode).toBe("dashboard");

    const cookieTenant = await page.evaluate(() => {
      const match = document.cookie.match(/(?:^|;\s*)ironframe-tenant=([^;]*)/);
      const raw = match?.[1]?.trim();
      if (!raw) return null;
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    });

    expect(cookieTenant?.toLowerCase()).toBe(stripeE2eTenantUuid.toLowerCase());
  });

  test("Block 4 — cross-tenant API fetch is rejected with 403", async ({ page }) => {
    test.skip(!stripeE2eTenantUuid, "Authenticated stripe-e2e-corp session required.");
    test.skip(!stripeE2eBuyerEmail, "Stripe E2E buyer email required.");

    await redeemInviteOnTenantSubdomain(page, stripeE2eBuyerEmail, STRIPE_E2E_PROVISION_SLUG);
    await page.goto(tenantSubdomainOrigin(STRIPE_E2E_PROVISION_SLUG));

    const foreignTenantUuid = TENANT_UUIDS.vaultbank;
    expect(foreignTenantUuid.toLowerCase()).not.toBe(stripeE2eTenantUuid.toLowerCase());

    const result = await page.evaluate(
      async ({ foreignUuid, activeUuid }) => {
        const res = await fetch(`/api/dmz/pipeline-telemetry?tenantUuid=${foreignUuid}`, {
          method: "GET",
          credentials: "include",
          headers: {
            "x-tenant-id": activeUuid,
          },
        });
        let body: Record<string, unknown> = {};
        try {
          body = (await res.json()) as Record<string, unknown>;
        } catch {
          body = {};
        }
        return { status: res.status, error: String(body.error ?? "") };
      },
      { foreignUuid: foreignTenantUuid, activeUuid: stripeE2eTenantUuid },
    );

    expect(result.status).toBe(403);
    expect(result.error).toMatch(/cross-tenant|Tenant isolation/i);
  });
});
