import { test, expect } from "@playwright/test";

/**
 * QA-02 guest path — public contact → P1 public-lead + Central T0 copy.
 * Run against production:
 *   E2E_PRODUCTION=1 npx playwright test tests/e2e/qa02PublicLeadInbound.spec.ts
 *
 * Optional:
 *   E2E_QA_CONTACT_EMAIL=you@example.com
 * Authenticated GTM checks (SalesTeam / Approvals) stay manual unless
 * E2E_QA_GTM_EMAIL + E2E_QA_GTM_PASSWORD are set.
 */

const BASE =
  process.env.E2E_PRODUCTION_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://ironframegrc.com";

test.describe("QA-02 public lead inbound (guest)", () => {
  test.describe.configure({ mode: "serial", timeout: 90_000 });

  test("submits contact form → public-lead 200 + Central T0 copy", async ({ page }) => {
    test.skip(
      process.env.E2E_PRODUCTION !== "1" &&
        !process.env.E2E_PRODUCTION_BASE_URL?.includes("ironframegrc.com"),
      "Set E2E_PRODUCTION=1 (or E2E_PRODUCTION_BASE_URL=https://ironframegrc.com) to hit live.",
    );

    const stamp = Date.now().toString(36);
    const orgName = `Ironframe QA02 ${stamp}`;
    const email =
      process.env.E2E_QA_CONTACT_EMAIL?.trim() ||
      `qa02+${stamp}@example.com`;

    await page.goto(`${BASE}/register/contact`, {
      waitUntil: "load",
      timeout: 60_000,
    });

    await expect(
      page.getByRole("heading", { name: /Schedule a .* workflow review/i }),
    ).toBeVisible({ timeout: 30_000 });

    // Wait for client hydration — filling SSR-only nodes gets wiped on remount.
    const emailInput = page.getByRole("textbox", { name: /Work email/i });
    const companyInput = page.getByRole("textbox", { name: /Organization/i });
    const aleInput = page.getByRole("textbox", {
      name: /Estimated annual loss exposure/i,
    });
    const submit = page.getByRole("button", {
      name: /Schedule .* workflow review/i,
    });
    await expect(submit).toBeEnabled({ timeout: 30_000 });

    await emailInput.fill(email);
    await companyInput.fill(orgName);
    await aleInput.fill("5000000");
    await expect(emailInput).toHaveValue(email);
    await expect(companyInput).toHaveValue(orgName);

    const leadResponsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/register/public-lead") &&
        res.request().method() === "POST",
      { timeout: 45_000 },
    );

    await submit.click();

    const leadResponse = await leadResponsePromise;
    expect(leadResponse.status(), "public-lead HTTP status").toBe(200);
    const body = (await leadResponse.json()) as {
      ok?: boolean;
      priority?: number;
      approvalsDraftQueued?: boolean;
      error?: string;
    };
    expect(body.ok, JSON.stringify(body)).toBe(true);
    expect(body.priority).toBe(1);
    expect(body.approvalsDraftQueued).toBe(true);

    const status = page.getByRole("status");
    await expect(status).toBeVisible({ timeout: 15_000 });
    const copy = (await status.innerText()).replace(/\s+/g, " ");
    expect(copy).toMatch(/1 business day/i);
    expect(copy).toMatch(/Central Time/i);
    expect(copy).toMatch(/9:00\s*AM/i);
    expect(copy).toMatch(/5:00\s*PM/i);
    expect(copy).toMatch(/Mon.?Fri/i);
    expect(copy).toMatch(/No workspace was created/i);
    expect(copy).not.toMatch(/1 business hour/i);
  });
});
