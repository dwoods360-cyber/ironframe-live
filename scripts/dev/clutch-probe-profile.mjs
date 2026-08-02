import { chromium } from "playwright";

const profile = process.argv[2] || "https://clutch.co/profile/foresite-cybersecurity";
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();
await page.goto(profile, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(3000);

const info = await page.evaluate(() => {
  const links = Array.from(document.querySelectorAll("a")).filter((a) =>
    /visit website|website/i.test(a.textContent || ""),
  );
  return links.slice(0, 15).map((a) => ({
    text: (a.textContent || "").trim().slice(0, 40),
    href: a.href,
    classes: String(a.className).slice(0, 140),
    target: a.target,
  }));
});
console.log(JSON.stringify(info, null, 2));

const visit = page.locator("a:has-text('Visit Website')").first();
if ((await visit.count()) > 0) {
  const [popup] = await Promise.all([
    context.waitForEvent("page", { timeout: 8000 }).catch(() => null),
    visit.click().catch(() => null),
  ]);
  const site = popup || page;
  await site.waitForTimeout(2500);
  console.log("landed:", site.url());
  if (popup) await popup.close();
}
await browser.close();
