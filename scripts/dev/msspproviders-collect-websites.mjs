/**
 * Local MSSPProviders.io collector (operator machine only — not Vercel / not cron).
 *
 * Walks the filtered browse results:
 *   View provider → Visit Website → capture final company website URL
 * Writes paste-ready CSV for Ironleads Import paste, then use Research only.
 *
 * Respect their site: slow pacing, public pages only. Check MSSPProviders terms
 * before large runs. robots.txt allows crawl of browse pages; interactive
 * automation is still your responsibility.
 *
 * Usage:
 *   npx playwright install chromium
 *   node scripts/dev/msspproviders-collect-websites.mjs
 *   node scripts/dev/msspproviders-collect-websites.mjs --headed --max-pages=2
 *
 * Env / flags:
 *   --start-url=...   default = filtered cybersecurity + compliance + cloud + SMB/MM
 *   --out=path.csv
 *   --headed
 *   --max-pages=N     safety cap (default 40)
 *   --delay-ms=N      pause between providers (default 2500)
 *   --skip-visit      only collect profile URLs (no Visit Website click)
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

function arg(name, fallback = null) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  if (process.argv.includes(`--${name}`)) return true;
  return fallback;
}

const DEFAULT_START =
  "https://msspproviders.io/browse/?services=compliance-management%2Ccloud-security&companySizes=smb-51-200%2Cmid-market-201-1000&q=cybersecurity&page=1";

const startUrl = String(arg("start-url", DEFAULT_START));
const outPath = resolve(
  String(arg("out", "scripts/dev/out/msspproviders-websites.csv")),
);
const headed = Boolean(arg("headed", false));
const maxPages = Math.max(1, Number(arg("max-pages", "40")) || 40);
const delayMs = Math.max(500, Number(arg("delay-ms", "2500")) || 2500);
const skipVisit = Boolean(arg("skip-visit", false));

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function isUsableWebsite(url) {
  if (!url || typeof url !== "string") return false;
  if (!/^https?:\/\//i.test(url)) return false;
  if (/msspproviders\.io|chrome-error:|about:blank|chromewebdata/i.test(url)) {
    return false;
  }
  return true;
}

async function dismissCookieBanner(page) {
  const candidates = [
    page.getByRole("button", { name: /accept|agree|got it|ok/i }),
    page.locator("button:has-text('Accept')"),
  ];
  for (const loc of candidates) {
    try {
      if (await loc.first().isVisible({ timeout: 800 })) {
        await loc.first().click({ timeout: 1000 });
        return;
      }
    } catch {
      /* ignore */
    }
  }
}

async function collectViewProviderHrefs(page) {
  const links = page.locator('a:has-text("View provider")');
  const n = await links.count();
  const hrefs = [];
  for (let i = 0; i < n; i++) {
    const href = await links.nth(i).getAttribute("href");
    if (!href) continue;
    const abs = new URL(href, page.url()).toString();
    if (!hrefs.includes(abs)) hrefs.push(abs);
  }
  return hrefs;
}

async function nextPageEnabled(page) {
  const next = page.getByRole("link", { name: /^next$/i }).or(
    page.locator('a:has-text("Next")'),
  );
  if ((await next.count()) === 0) return false;
  const el = next.first();
  const disabled =
    (await el.getAttribute("aria-disabled")) === "true" ||
    (await el.getAttribute("disabled")) != null ||
    ((await el.getAttribute("class")) || "").toLowerCase().includes("disabled") ||
    ((await el.getAttribute("class")) || "").toLowerCase().includes("opacity-50");
  if (disabled) return false;
  // Grayed / non-navigable
  const href = await el.getAttribute("href");
  if (!href || href === "#" || href.endsWith("page=#")) return false;
  return true;
}

async function clickNext(page) {
  const next = page.getByRole("link", { name: /^next$/i }).or(
    page.locator('a:has-text("Next")'),
  );
  await next.first().click();
  await page.waitForLoadState("domcontentloaded");
  await sleep(1200);
}

async function resolveCompanyAndWebsite(context, profileUrl, { skipVisit, delayMs }) {
  const page = await context.newPage();
  try {
    await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await dismissCookieBanner(page);
    await sleep(400);

    const title =
      (
        await page
          .locator("h1")
          .first()
          .textContent()
          .catch(() => null)
      )?.trim() ||
      (
        await page
          .locator("h2")
          .first()
          .textContent()
          .catch(() => null)
      )?.trim() ||
      "Unknown";

    // Prefer an explicit Visit Website control
    const visit = page
      .getByRole("link", { name: /visit website/i })
      .or(page.locator('a:has-text("Visit Website")'))
      .or(page.locator('a:has-text("Visit website")'));

    let websiteUrl = null;
    if ((await visit.count()) > 0) {
      const href = await visit.first().getAttribute("href");
      if (href && !skipVisit) {
        // Follow redirect to the real company site (new tab or same)
        const [popup] = await Promise.all([
          context.waitForEvent("page", { timeout: 8000 }).catch(() => null),
          visit.first().click({ timeout: 8000 }).catch(() => null),
        ]);
        const site = popup ?? page;
        try {
          await site.waitForLoadState("domcontentloaded", { timeout: 30000 });
          await sleep(800);
          const landed = site.url();
          if (isUsableWebsite(landed)) {
            websiteUrl = landed;
          } else if (isUsableWebsite(href)) {
            websiteUrl = href.startsWith("http")
              ? href
              : new URL(href, profileUrl).toString();
          }
        } finally {
          if (popup) await popup.close().catch(() => {});
        }
      } else if (href && isUsableWebsite(href)) {
        websiteUrl = href.startsWith("http")
          ? href
          : new URL(href, profileUrl).toString();
      }
    }

    // Fallback: first external http(s) link that isn't social/directory
    if (!websiteUrl) {
      const anchors = page.locator('a[href^="http"]');
      const count = await anchors.count();
      for (let i = 0; i < Math.min(count, 40); i++) {
        const href = await anchors.nth(i).getAttribute("href");
        if (!href) continue;
        if (
          !isUsableWebsite(href) ||
          /linkedin\.com|facebook\.com|twitter\.com|x\.com|youtube\.com/i.test(href)
        ) {
          continue;
        }
        websiteUrl = href;
        break;
      }
    }
    if (websiteUrl && !isUsableWebsite(websiteUrl)) websiteUrl = null;

    await sleep(delayMs);
    return {
      companyName: title.replace(/\s+logo$/i, "").trim(),
      websiteUrl,
      profileUrl,
    };
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  console.log(
    JSON.stringify(
      {
        startUrl,
        outPath,
        headed,
        maxPages,
        delayMs,
        skipVisit,
        note: "Collects company,website for Import paste — Research only stays in Ironleads.",
      },
      null,
      2,
    ),
  );

  const browser = await chromium.launch({ headless: !headed });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 IronframeOperatorCollector/1.0",
    viewport: { width: 1280, height: 900 },
  });
  const browse = await context.newPage();
  const rows = [];
  const seenCompanies = new Set();
  const checkpointPath = outPath.replace(/\.csv$/i, ".checkpoint.json");
  mkdirSync(dirname(outPath), { recursive: true });

  if (existsSync(checkpointPath) && process.argv.includes("--resume")) {
    try {
      const prior = JSON.parse(readFileSync(checkpointPath, "utf8"));
      if (Array.isArray(prior.rows)) {
        for (const row of prior.rows) {
          rows.push(row);
          seenCompanies.add(String(row.companyName || "").toLowerCase());
        }
        console.log(`resumed ${rows.length} rows from checkpoint`);
      }
    } catch (err) {
      console.warn("checkpoint load failed", err);
    }
  }

  function persistCheckpoint(pageIdx) {
    writeFileSync(
      checkpointPath,
      JSON.stringify({ pageIdx, rows, savedAt: new Date().toISOString() }, null, 2),
      "utf8",
    );
    const lines = [
      "company,website",
      ...rows.map(
        (r) => `${csvEscape(r.companyName)},${csvEscape(r.websiteUrl ?? "")}`,
      ),
    ];
    writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
    const pastePath = outPath.replace(/\.csv$/i, ".paste.txt");
    writeFileSync(
      pastePath,
      rows
        .map((r) =>
          r.websiteUrl ? `${r.companyName}, ${r.websiteUrl}` : r.companyName,
        )
        .join("\n") + "\n",
      "utf8",
    );
  }

  try {
    await browse.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await dismissCookieBanner(browse);
    await sleep(1500);

    for (let pageIdx = 1; pageIdx <= maxPages; pageIdx++) {
      const profiles = await collectViewProviderHrefs(browse);
      console.log(`page ${pageIdx}: ${profiles.length} View provider links`);
      if (profiles.length === 0) break;

      for (const profileUrl of profiles) {
        let row;
        try {
          row = await resolveCompanyAndWebsite(context, profileUrl, {
            skipVisit,
            delayMs,
          });
        } catch (err) {
          console.warn(`  error on ${profileUrl}: ${err?.message || err}`);
          continue;
        }
        const key = row.companyName.toLowerCase();
        if (seenCompanies.has(key)) {
          console.log(`  skip dup ${row.companyName}`);
          continue;
        }
        seenCompanies.add(key);
        rows.push(row);
        console.log(
          `  + ${row.companyName} → ${row.websiteUrl ?? "(no website)"} (${rows.length})`,
        );
        if (rows.length % 5 === 0) persistCheckpoint(pageIdx);
      }
      persistCheckpoint(pageIdx);

      const canNext = await nextPageEnabled(browse);
      if (!canNext) {
        console.log("Next disabled / missing — done.");
        break;
      }
      await clickNext(browse);
    }
  } finally {
    persistCheckpoint(0);
    await browser.close();
  }

  const pastePath = outPath.replace(/\.csv$/i, ".paste.txt");
  console.log(
    JSON.stringify(
      {
        collected: rows.length,
        withWebsite: rows.filter((r) => r.websiteUrl).length,
        csv: outPath,
        paste: pastePath,
        checkpoint: checkpointPath,
        next: "Paste .paste.txt into Ironleads (≤100/batch) → Import paste → Research only",
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
