import { test, expect, request as playwrightRequest } from "@playwright/test";

/**
 * Backup ladder QA — T1 (instant) + T2 (accel wall-clock) via cron.
 *
 * Requires production with IRONFRAME_INBOUND_SLA_TEST_ACCEL=1 (T2=2m wall-clock).
 *
 *   E2E_PRODUCTION=1 \
 *   E2E_PRODUCTION_BASE_URL=https://ironframegrc.com \
 *   IRONFRAME_CRON_SECRET=… \
 *   npx playwright test tests/e2e/qaInboundSlaBackupLadder.spec.ts --project=chromium
 *
 * Optional: E2E_QA_CONTACT_EMAIL for a real inbox (T1 mail).
 * T3 skipped unless IRONFRAME_INBOUND_SLA_AUTOSEND is on (leave off for this smoke).
 */

const BASE =
  process.env.E2E_PRODUCTION_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://ironframegrc.com";

test.describe("QA inbound SLA backup ladder (T1 + T2 accel)", () => {
  test.describe.configure({ mode: "serial", timeout: 300_000 });

  test("T1 ack on submit, then T2 escalate after accel wait + cron", async ({ page }) => {
    test.skip(
      process.env.E2E_PRODUCTION !== "1" &&
        !process.env.E2E_PRODUCTION_BASE_URL?.includes("ironframegrc.com"),
      "Set E2E_PRODUCTION=1 to hit live.",
    );
    const cronSecret = process.env.IRONFRAME_CRON_SECRET?.trim();
    test.skip(!cronSecret, "IRONFRAME_CRON_SECRET required to invoke SLA cron.");

    const stamp = Date.now().toString(36);
    const orgName = `Ironframe SLA Ladder ${stamp}`;
    const email =
      process.env.E2E_QA_CONTACT_EMAIL?.trim() || `sla-ladder+${stamp}@example.com`;

    await page.goto(`${BASE}/register/contact`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="company"]').fill(orgName);
    await page.locator('input[name="reportedAle"]').fill("5000000");

    const leadResponsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/register/public-lead") &&
        res.request().method() === "POST",
      { timeout: 45_000 },
    );

    await page.getByRole("button", { name: /Schedule .* workflow review/i }).click();

    const leadResponse = await leadResponsePromise;
    expect(leadResponse.status()).toBe(200);
    const body = (await leadResponse.json()) as {
      ok?: boolean;
      priority?: number;
      approvalsDraftQueued?: boolean;
      t1AckSent?: boolean;
      prospectSlug?: string;
    };
    expect(body.ok).toBe(true);
    expect(body.priority).toBe(1);
    expect(body.approvalsDraftQueued).toBe(true);

    const status = page.getByRole("status");
    await expect(status).toBeVisible({ timeout: 15_000 });
    const copy = (await status.innerText()).replace(/\s+/g, " ");
    expect(copy).toMatch(/Central Time/i);
    expect(copy).toMatch(/No workspace was created/i);

    // T1: prefer API flag when deploy includes it; otherwise do not fail older builds.
    if (typeof body.t1AckSent === "boolean") {
      expect(body.t1AckSent, "T1 ack should send when Resend + T1 enabled").toBe(true);
    }

    // Wait past accel T2 (2 minutes) + buffer before cron.
    await page.waitForTimeout(130_000);

    const api = await playwrightRequest.newContext();
    const cronRes = await api.post(`${BASE}/api/internal/cron/inbound-lead-sla`, {
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    expect(cronRes.status(), await cronRes.text()).toBe(200);
    const cronBody = (await cronRes.json()) as {
      ok?: boolean;
      t2?: number;
      t3?: number;
      testAccel?: boolean;
      t2Minutes?: number;
      scanned?: number;
    };
    expect(cronBody.ok).toBe(true);
    expect(cronBody.testAccel, "TEST ACCEL must be on for Sunday / fast ladder").toBe(true);
    expect(cronBody.t2Minutes).toBe(2);
    expect(
      (cronBody.t2 ?? 0) >= 1,
      `Expected t2>=1 after accel wait; got ${JSON.stringify(cronBody)}`,
    ).toBe(true);

    await api.dispose();
  });
});
