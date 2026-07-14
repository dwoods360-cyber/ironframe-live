import { expect, test } from "@playwright/test";

/**
 * Direct engine smoke — does not require ops-portal auth.
 * Proves the Cloud Run boardroom UI + Query SSE path that the portal iframe embeds.
 */
const IRONBOARD_URL =
  process.env.E2E_IRONBOARD_URL?.trim().replace(/\/$/, "") ||
  "https://ironframe-ironboard-4qpposvc7q-uc.a.run.app";

test.describe("Ironboard Cloud Run smoke", () => {
  test("serves boardroom UI and returns Query tokens", async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto(`${IRONBOARD_URL}/`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#query-form")).toBeVisible();
    await expect(page.locator("#user-prompt")).toBeVisible();
    await expect(page.locator("#submit-btn")).toBeVisible();

    await page.locator("#user-prompt").fill("Say hi in one word.");
    await page.locator("#submit-btn").click();

    await expect
      .poll(
        async () => {
          const text = (await page.locator("#chat-window").innerText()).trim();
          return text.length > 0 && !/streaming/i.test(text) ? text : "";
        },
        { timeout: 90_000, intervals: [500, 1000, 2000] },
      )
      .not.toEqual("");

    const chat = await page.locator("#chat-window").innerText();
    expect(chat.toLowerCase()).not.toContain("live stream faulted");
    expect(chat.toLowerCase()).not.toContain("google_api_key missing");
  });
});
