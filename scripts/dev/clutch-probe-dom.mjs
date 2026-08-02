import { chromium } from "playwright";

const url =
  "https://clutch.co/us/it-services/cybersecurity?client_budget=100000&related_services=field_pp_sl_compliance_consulting";

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(6000);

const info = await page.evaluate(() => {
  const view = Array.from(document.querySelectorAll("a")).filter((a) =>
    /view profile|view provider/i.test(a.textContent || ""),
  );
  const sample = view.slice(0, 10).map((a) => ({
    text: (a.textContent || "").trim().slice(0, 40),
    href: a.href,
    classes: String(a.className).slice(0, 120),
    parent: String(a.closest("[class]")?.className || "").slice(0, 120),
  }));
  const profiles = Array.from(document.querySelectorAll('a[href*="/profile/"]'))
    .slice(0, 20)
    .map((a) => ({
      href: a.href.split("?")[0],
      text: (a.textContent || "").trim().slice(0, 60),
    }));
  const next = Array.from(document.querySelectorAll("a,button"))
    .filter((el) => /^next$/i.test((el.textContent || "").trim()))
    .map((el) => ({
      tag: el.tagName,
      href: el.href || null,
      disabled: Boolean(el.disabled),
      aria: el.getAttribute("aria-disabled"),
      class: String(el.className).slice(0, 120),
    }));
  return { viewCount: view.length, sample, profileSample: profiles, next };
});

console.log(JSON.stringify(info, null, 2));
await browser.close();
