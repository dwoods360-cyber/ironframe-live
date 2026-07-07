import { test, expect } from "@playwright/test";

test("marketing city subtitle cycles", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/marketing", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });

  const readActiveCityLine = () =>
    page.evaluate(() => {
      const lines = Array.from(
        document.querySelectorAll<HTMLElement>(".marketing-city-cycle-line"),
      );
      const visible = lines
        .filter((line) => Number(window.getComputedStyle(line).opacity) > 0.5)
        .map((line) => line.textContent?.trim() ?? "");
      return visible.join("|");
    });

  await expect(page.getByTestId("marketing-city-cycle")).toBeAttached({ timeout: 10_000 });

  const initial = (await readActiveCityLine()).trim();
  expect(initial).toBe("NEW YORK — LONDON — FRANKFURT");

  await page.waitForFunction(
    (start) => {
      const lines = Array.from(document.querySelectorAll<HTMLElement>(".marketing-city-cycle-line"));
      const visible = lines
        .filter((line) => Number(window.getComputedStyle(line).opacity) > 0.5)
        .map((line) => line.textContent?.trim() ?? "")
        .join("|");
      return visible.length > 0 && visible !== start;
    },
    initial,
    { timeout: 12_000 },
  );

  const after = (await readActiveCityLine()).trim();
  expect(after).toBe("WASHINGTON DC — TEL AVIV — OTTAWA");
});

test("marketing city subtitle cycles with prefers-reduced-motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("http://127.0.0.1:3000/marketing", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });

  const readActiveCityLine = () =>
    page.evaluate(() => {
      const lines = Array.from(
        document.querySelectorAll<HTMLElement>(".marketing-city-cycle-line"),
      );
      return lines
        .filter((line) => Number(window.getComputedStyle(line).opacity) > 0.5)
        .map((line) => line.textContent?.trim() ?? "")
        .join("|");
    });

  const initial = (await readActiveCityLine()).trim();
  expect(initial).toBe("NEW YORK — LONDON — FRANKFURT");

  await page.waitForFunction(
    (start) => {
      const lines = Array.from(document.querySelectorAll<HTMLElement>(".marketing-city-cycle-line"));
      const visible = lines
        .filter((line) => Number(window.getComputedStyle(line).opacity) > 0.5)
        .map((line) => line.textContent?.trim() ?? "")
        .join("|");
      return visible.length > 0 && visible !== start;
    },
    initial,
    { timeout: 30_000 },
  );

  const after = (await readActiveCityLine()).trim();
  expect(after).toBe("WASHINGTON DC — TEL AVIV — OTTAWA");
});
