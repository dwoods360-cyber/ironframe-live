import { test, expect, request as playwrightRequest } from "@playwright/test";
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

/**
 * Backup ladder QA — T1 always; T2 when IRONFRAME_CRON_SECRET + TEST_ACCEL are available.
 *
 *   E2E_PRODUCTION=1 E2E_PRODUCTION_BASE_URL=https://ironframegrc.com \
 *   IRONFRAME_CRON_SECRET=… \
 *   npx playwright test tests/e2e/qaInboundSlaBackupLadder.spec.ts --project=chromium
 */

const BASE =
  process.env.E2E_PRODUCTION_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://ironframegrc.com";

test.describe("QA inbound SLA backup ladder", () => {
  test.describe.configure({ mode: "serial", timeout: 300_000 });

  test("T1: contact submit → public-lead + Central copy (+ optional ack flag)", async ({
    page,
  }) => {
    test.skip(
      process.env.E2E_PRODUCTION !== "1" &&
        !process.env.E2E_PRODUCTION_BASE_URL?.includes("ironframegrc.com"),
      "Set E2E_PRODUCTION=1 to hit live.",
    );

    const stamp = Date.now().toString(36);
    const orgName = `Ironframe SLA T1 ${stamp}`;
    const email =
      process.env.E2E_QA_CONTACT_EMAIL?.trim() || `sla-t1+${stamp}@example.com`;

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
    };
    expect(body.ok).toBe(true);
    expect(body.priority).toBe(1);
    expect(body.approvalsDraftQueued).toBe(true);

    const status = page.getByRole("status");
    await expect(status).toBeVisible({ timeout: 15_000 });
    const copy = (await status.innerText()).replace(/\s+/g, " ");
    expect(copy).toMatch(/Central Time/i);
    expect(copy).toMatch(/No workspace was created/i);

    if (typeof body.t1AckSent === "boolean") {
      // Soft: Resend may fail; log for operators
      console.info("[qa-sla] t1AckSent=", body.t1AckSent);
    }
  });

  test("T2: after accel wait, cron escalates (needs CRON_SECRET + TEST_ACCEL)", async () => {
    test.skip(
      process.env.E2E_PRODUCTION !== "1" &&
        !process.env.E2E_PRODUCTION_BASE_URL?.includes("ironframegrc.com"),
      "Set E2E_PRODUCTION=1 to hit live.",
    );
    const cronSecret = process.env.IRONFRAME_CRON_SECRET?.trim();
    test.skip(
      !cronSecret,
      "Export IRONFRAME_CRON_SECRET (prod value) in the shell — local .env.local has it blank / CLI cannot pull sensitive secrets.",
    );

    // Ensure a fresh lead exists for this worker (independent of T1 test email).
    const stamp = Date.now().toString(36);
    const orgName = `Ironframe SLA T2 ${stamp}`;
    const email =
      process.env.E2E_QA_CONTACT_EMAIL?.trim() || `sla-t2+${stamp}@example.com`;

    const api = await playwrightRequest.newContext();
    const leadRes = await api.post(`${BASE}/api/register/public-lead`, {
      data: {
        orgName,
        email,
        reportedAleDollars: "5000000",
      },
    });
    expect(leadRes.status()).toBe(200);
    const leadBody = (await leadRes.json()) as { ok?: boolean };
    expect(leadBody.ok).toBe(true);

    await new Promise((r) => setTimeout(r, 130_000));

    const cronRes = await api.post(`${BASE}/api/internal/cron/inbound-lead-sla`, {
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    expect(cronRes.status(), await cronRes.text()).toBe(200);
    const cronBody = (await cronRes.json()) as {
      ok?: boolean;
      t2?: number;
      testAccel?: boolean;
      t2Minutes?: number;
    };
    expect(cronBody.ok).toBe(true);
    expect(cronBody.testAccel, "Set IRONFRAME_INBOUND_SLA_TEST_ACCEL=1 on Vercel").toBe(
      true,
    );
    expect(cronBody.t2Minutes).toBe(2);
    expect((cronBody.t2 ?? 0) >= 1, JSON.stringify(cronBody)).toBe(true);
    await api.dispose();
  });
});
