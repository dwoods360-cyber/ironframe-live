import { test, expect } from "@playwright/test";

test("marketing city subtitle cycles", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/marketing", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });

  const readActiveCityLine = () =>
    page.getByTestId("marketing-city-cycle").innerText();

  await expect(page.getByTestId("marketing-city-cycle")).toBeVisible({ timeout: 10_000 });

  const initial = (await readActiveCityLine()).trim();
  expect(initial).toBe("NEW YORK — LONDON — FRANKFURT");

  await page.waitForFunction(
    (start) => {
      const el = document.querySelector("[data-testid='marketing-city-cycle']");
      const text = el?.textContent?.trim() ?? "";
      return text.length > 0 && text !== start;
    },
    initial,
    { timeout: 8_000 },
  );

  const after = (await readActiveCityLine()).trim();
  expect(after).toBe("WASHINGTON DC — TEL AVIV — OTTAWA");
});
