import { test, expect } from "@playwright/test";

import {
  extractBuyingPersons,
  stripHtmlToText,
} from "@/app/lib/server/ironleadsBuyingCommitteeExtract";

/**
 * Smoke: a different firm than Absolute Logic — live About/team page must yield
 * extractable buying-committee names (site Research layer, not Brave/Apollo).
 *
 * Target: Pivot Point Security meet-the-team (canonical path used in research discovery).
 */
test.describe("Ironleads About/team extract smoke", () => {
  test.setTimeout(90_000);

  test("Pivot Point meet-the-team page yields named leadership via extractBuyingPersons", async ({
    page,
  }) => {
    const url = "https://www.pivotpointsecurity.com/company/meet-the-team/";
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    expect(response?.ok() || response?.status() === 304).toBeTruthy();

    const html = await page.content();
    expect(html.length).toBeGreaterThan(500);

    const text = stripHtmlToText(html);
    expect(text.length).toBeGreaterThan(200);

    // Page still exposes leadership (smoke against empty/bot shell).
    expect(text).toMatch(/Verry|Managing Director|CISO|CEO|Founder/i);

    const people = extractBuyingPersons(text);
    const named = people.filter((p) => Boolean(p.fullName?.trim()));
    expect(
      named.length,
      `expected ≥1 buying-role name from ${url}; got ${JSON.stringify(people)}`,
    ).toBeGreaterThanOrEqual(1);

    // Known public lead on this page — keep assertion soft if title layout drifts.
    const hasVerry = named.some((p) => /verry/i.test(p.fullName));
    const hasSeniorRole = named.some((p) =>
      ["CEO", "CISO", "MANAGING_DIRECTOR", "DIRECTOR_OPS"].includes(p.role),
    );
    expect(hasVerry || hasSeniorRole).toBe(true);
  });
});
