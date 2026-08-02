import { chromium } from "playwright";

const url =
  process.argv[2] ||
  "https://clutch.co/us/it-services/cybersecurity?client_budget=100000&related_services=field_pp_sl_compliance_consulting";

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(5000);
const profiles = await page.locator("a.directory_profile").count();
const next = page.locator("a.sg-pagination-v2-next").first();
const nextCount = await page.locator("a.sg-pagination-v2-next").count();
let nextInfo = null;
if (nextCount) {
  nextInfo = {
    href: await next.getAttribute("href"),
    class: await next.getAttribute("class"),
    visible: await next.isVisible(),
  };
}
const page2 =
  "https://clutch.co/us/it-services/cybersecurity?client_budget=100000&page=2&related_services=field_pp_sl_compliance_consulting";
await page.goto(page2, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(4000);
const profiles2 = await page.locator("a.directory_profile").count();
console.log(JSON.stringify({ page1Profiles: profiles, nextInfo, page2Profiles: profiles2 }, null, 2));
await browser.close();
