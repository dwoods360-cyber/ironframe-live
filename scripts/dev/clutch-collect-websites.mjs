/**
 * Clutch cybersecurity directory → Visit Website → company-site review.
 *
 * Operator machine only (not Vercel / not cron). Cloudflare often blocks
 * headless — prefer --headed. Slow pacing; public pages only. You own ToS /
 * robots compliance for large runs.
 *
 * Flow per listing page:
 *   open directory → for each provider profile → Visit Website → crawl site
 *   paths for MSSP/GRC signals → close site → next provider → Next page until grayed
 *
 * Usage:
 *   npx playwright install chromium
 *   node scripts/dev/clutch-collect-websites.mjs --headed --resume
 *   node scripts/dev/clutch-collect-websites.mjs --headed --max-pages=2 --max-providers=5
 *
 * Flags:
 *   --start-url=...
 *   --out=path.jsonl
 *   --headed
 *   --resume
 *   --max-pages=N       (default 80)
 *   --max-providers=N   safety cap across all pages (default 500)
 *   --delay-ms=N        (default 3500)
 *   --site-paths=N      max company paths to fetch (default 10)
 *   --skip-site-review  only capture website URL
 */

import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  appendFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

function arg(name, fallback = null) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  if (process.argv.includes(`--${name}`)) return true;
  return fallback;
}

const DEFAULT_START =
  "https://clutch.co/us/it-services/cybersecurity?client_budget=100000&related_services=field_pp_sl_compliance_consulting";

const startUrl = String(arg("start-url", DEFAULT_START));
const outPath = resolve(String(arg("out", "scripts/dev/out/clutch-cybersecurity.jsonl")));
const pastePath = outPath.replace(/\.jsonl$/i, ".paste.txt");
const csvPath = outPath.replace(/\.jsonl$/i, ".csv");
const checkpointPath = outPath.replace(/\.jsonl$/i, ".checkpoint.json");
const logPath = outPath.replace(/\.jsonl$/i, ".log");
const headed = Boolean(arg("headed", false));
const maxPages = Math.max(1, Number(arg("max-pages", "80")) || 80);
const maxProviders = Math.max(1, Number(arg("max-providers", "500")) || 500);
const delayMs = Math.max(800, Number(arg("delay-ms", "3500")) || 3500);
const sitePathsMax = Math.max(1, Number(arg("site-paths", "10")) || 10);
const skipSiteReview = Boolean(arg("skip-site-review", false));
const resume = Boolean(arg("resume", false));

const SITE_PATHS = [
  "/",
  "/about",
  "/about-us",
  "/company",
  "/services",
  "/solutions",
  "/compliance",
  "/grc",
  "/managed-services",
  "/vCISO",
  "/vciso",
  "/contact",
  "/contact-us",
  "/team",
  "/leadership",
  "/company/meet-the-team",
  "/meet-the-team",
];

const GRC_PRODUCTS = [
  { re: /\boscar\b/i, name: "OSCAR" },
  { re: /\bradius\s*360\b|\bradius360\b/i, name: "Radius360" },
  { re: /\bdrata\b/i, name: "Drata" },
  { re: /\bvanta\b/i, name: "Vanta" },
  { re: /\bhyperproof\b/i, name: "Hyperproof" },
  { re: /\blogicgate\b/i, name: "LogicGate" },
  { re: /\b(?:rsa\s+)?archer\b/i, name: "RSA Archer" },
  { re: /\bservice\s*now\b/i, name: "ServiceNow GRC" },
];

const SERVICE_PATTERNS = [
  { re: /\bmssp\b|managed\s+security\s+service/i, label: "MSSP" },
  { re: /\bvciso\b|virtual\s+ciso|fractional\s+ciso/i, label: "vCISO" },
  { re: /\bmanaged\s+grc\b|grc\s+as\s+a\s+service|compliance\s+as\s+a\s+service/i, label: "managed GRC" },
  { re: /\bpenetration\s+test|\bpentest\b/i, label: "offensive security" },
  { re: /\bsoc\b|security\s+operations/i, label: "SOC" },
  { re: /\baudit\s+support|soc\s*2|iso\s*27001|cmmc|hipaa/i, label: "compliance advisory" },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function log(line) {
  const msg = `[${new Date().toISOString()}] ${line}`;
  console.log(msg);
  try {
    mkdirSync(dirname(logPath), { recursive: true });
    appendFileSync(logPath, msg + "\n", "utf8");
  } catch {
    /* ignore */
  }
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function isUsableWebsite(url) {
  if (!url || typeof url !== "string") return false;
  if (!/^https?:\/\//i.test(url)) return false;
  if (
    /clutch\.co|chrome-error:|about:blank|chromewebdata|google\.com\/search|facebook\.com|instagram\.com|linkedin\.com|twitter\.com|x\.com|youtube\.com|tiktok\.com|usertesting\.com|doubleclick\.|googlesyndication|bit\.ly|tinyurl/i.test(
      url,
    )
  ) {
    return false;
  }
  return true;
}

/** Unwrap r.clutch.co/redirect?...&u=https%3A%2F%2Fexample.com */
function websiteFromClutchRedirect(href) {
  if (!href) return null;
  try {
    const u = new URL(href);
    const target = u.searchParams.get("u");
    if (target && isUsableWebsite(target)) {
      return target.split("#")[0];
    }
    const provider = u.searchParams.get("provider_website");
    if (provider) {
      const withScheme = provider.startsWith("http")
        ? provider
        : `https://${provider}`;
      if (isUsableWebsite(withScheme)) return withScheme.split("#")[0];
    }
  } catch {
    /* ignore */
  }
  return null;
}

function stripTracking(url) {
  try {
    const u = new URL(url);
    for (const key of [...u.searchParams.keys()]) {
      if (/^utm_/i.test(key) || key === "fbclid" || key === "gclid") {
        u.searchParams.delete(key);
      }
    }
    const qs = u.searchParams.toString();
    return qs ? `${u.origin}${u.pathname}?${qs}` : `${u.origin}${u.pathname}`;
  } catch {
    return url;
  }
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

async function dismissCookieBanner(page) {
  const candidates = [
    page.getByRole("button", { name: /accept all|accept|agree|got it|allow all|ok/i }),
    page.locator("button:has-text('Accept')"),
    page.locator("#onetrust-accept-btn-handler"),
  ];
  for (const loc of candidates) {
    try {
      if (await loc.first().isVisible({ timeout: 700 })) {
        await loc.first().click({ timeout: 1000 });
        return;
      }
    } catch {
      /* ignore */
    }
  }
}

async function waitForClutchListings(page) {
  // Cloudflare interstitial or empty shell
  for (let attempt = 0; attempt < 24; attempt++) {
    const body = ((await page.textContent("body").catch(() => "")) || "").toLowerCase();
    if (
      body.includes("just a moment") ||
      body.includes("performing security verification") ||
      body.includes("checking your browser")
    ) {
      log(`Cloudflare challenge visible (attempt ${attempt + 1}) — waiting…`);
      await sleep(2500);
      continue;
    }
    const n = await page
      .locator("a.directory_profile, a.provider__cta-link:has-text('View Profile')")
      .count()
      .catch(() => 0);
    if (n > 0) return true;
    await sleep(1500);
  }
  return false;
}

async function scrollDirectory(page) {
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => window.scrollBy(0, Math.floor(window.innerHeight * 0.9)));
    await sleep(450);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(400);
}

async function collectProviderProfileHrefs(page) {
  await scrollDirectory(page);
  // Directory cards only — not every /profile/ link in the card body.
  const links = page.locator(
    "a.directory_profile, a.provider__cta-link:has-text('View Profile'), a.provider__cta-link:has-text('View profile')",
  );
  const n = await links.count();
  const hrefs = [];
  for (let i = 0; i < n; i++) {
    const href = await links.nth(i).getAttribute("href");
    if (!href) continue;
    try {
      const abs = new URL(href, page.url()).toString();
      if (!/clutch\.co\/profile\//i.test(abs)) continue;
      const clean = abs.split("?")[0].split("#")[0];
      if (!hrefs.includes(clean)) hrefs.push(clean);
    } catch {
      /* ignore */
    }
  }
  return hrefs;
}

/** Build directory URL for page N (1-based). Clutch Next is unreliable after long walks. */
function directoryUrlForPage(baseUrl, pageNum) {
  const u = new URL(baseUrl);
  if (pageNum <= 1) u.searchParams.delete("page");
  else u.searchParams.set("page", String(pageNum));
  return u.toString();
}

function clutchNextLocator(page) {
  return page
    .locator("a.sg-pagination-v2-next")
    .or(page.locator('a[rel="next"]'))
    .or(page.getByRole("link", { name: /^next$/i }));
}

async function nextPageEnabled(page) {
  const next = clutchNextLocator(page);
  if ((await next.count()) === 0) return false;
  const el = next.first();
  try {
    if (!(await el.isVisible({ timeout: 800 }))) return false;
  } catch {
    return false;
  }
  const ariaDisabled = await el.getAttribute("aria-disabled");
  const disabledAttr = await el.getAttribute("disabled");
  const cls = ((await el.getAttribute("class")) || "").toLowerCase();
  if (ariaDisabled === "true" || disabledAttr != null) return false;
  if (
    cls.includes("disabled") ||
    cls.includes("opacity-50") ||
    cls.includes("is-disabled") ||
    cls.includes("sg-pagination-v2-next--disabled")
  ) {
    return false;
  }
  const href = await el.getAttribute("href");
  if (!href || href === "#") return false;
  return true;
}

async function clickNext(page) {
  const next = clutchNextLocator(page);
  const href = await next.first().getAttribute("href");
  if (href && href !== "#") {
    const abs = new URL(href, page.url()).toString();
    await page.goto(abs, { waitUntil: "domcontentloaded", timeout: 60000 });
  } else {
    await next.first().click({ timeout: 10000 });
    await page.waitForLoadState("domcontentloaded");
  }
  await sleep(2500);
  const ok = await waitForClutchListings(page);
  if (!ok) {
    // one retry — Clutch sometimes returns empty shell on page flips
    await sleep(3000);
    await page.reload({ waitUntil: "domcontentloaded" });
    await sleep(2000);
    await waitForClutchListings(page);
  }
}

function analyzeCorpus(corpus) {
  const products = [];
  for (const row of GRC_PRODUCTS) {
    if (row.re.test(corpus)) products.push(row.name);
  }
  const services = [];
  for (const row of SERVICE_PATTERNS) {
    if (row.re.test(corpus)) services.push(row.label);
  }
  const emails = unique(
    [...corpus.matchAll(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi)].map((m) =>
      m[0].toLowerCase(),
    ),
  ).filter((e) => !/example\.com|sentry\.|wixpress|cloudflare/i.test(e));
  const phones = unique(
    [...corpus.matchAll(/(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g)].map(
      (m) => m[0],
    ),
  ).slice(0, 5);
  return {
    existingGrcProducts: unique(products),
    relevantServices: unique(services),
    publishedEmails: emails.slice(0, 8),
    phones,
    fitHint:
      services.some((s) => ["MSSP", "vCISO", "managed GRC", "compliance advisory"].includes(s)) ||
      /mssp|vciso|managed\s+grc|cybersecurity/i.test(corpus),
  };
}

async function reviewCompanySite(context, websiteUrl) {
  const page = await context.newPage();
  const pagesFetched = [];
  let corpus = "";
  try {
    const origin = new URL(websiteUrl).origin;
    const paths = SITE_PATHS.slice(0, sitePathsMax);
    for (const path of paths) {
      const url = path === "/" ? origin + "/" : new URL(path, origin).toString();
      try {
        const res = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 25000,
        });
        if (!res || res.status() >= 400) continue;
        await dismissCookieBanner(page);
        await sleep(400);
        const text = ((await page.locator("body").innerText().catch(() => "")) || "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 80_000);
        if (text.length < 40) continue;
        pagesFetched.push(page.url());
        corpus += `\n${text}`;
      } catch {
        /* path miss */
      }
    }
  } finally {
    await page.close().catch(() => {});
  }
  const analysis = analyzeCorpus(corpus);
  return {
    pagesFetched: unique(pagesFetched),
    ...analysis,
    corpusChars: corpus.length,
  };
}

async function resolveProvider(context, profileUrl) {
  const page = await context.newPage();
  try {
    await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await dismissCookieBanner(page);
    await sleep(600);

    const companyName =
      (
        await page
          .locator("h1")
          .first()
          .textContent()
          .catch(() => null)
      )?.trim() ||
      (
        await page
          .locator('[data-qa="profile-header"] h1, .profile-header h1')
          .first()
          .textContent()
          .catch(() => null)
      )?.trim() ||
      "Unknown";

    const visit = page
      .locator("a.website-link__item")
      .or(page.locator("a.profile-short-actions__website-link"))
      .or(page.getByRole("link", { name: /visit website/i }))
      .or(page.locator('a:has-text("Visit Website")'));

    let websiteUrl = null;
    let siteReview = null;

    if ((await visit.count()) > 0) {
      const href = await visit.first().getAttribute("href");
      // Prefer unwrapping Clutch redirect (avoids bad landings / overlays)
      websiteUrl = websiteFromClutchRedirect(href);
      if (!websiteUrl && href && isUsableWebsite(href)) {
        websiteUrl = href;
      }

      if (!websiteUrl && href) {
        const [popup] = await Promise.all([
          context.waitForEvent("page", { timeout: 10000 }).catch(() => null),
          visit.first().click({ timeout: 10000 }).catch(() => null),
        ]);
        const site = popup ?? page;
        try {
          await site.waitForLoadState("domcontentloaded", { timeout: 35000 });
          await sleep(1000);
          const landed = site.url();
          if (isUsableWebsite(landed)) websiteUrl = landed.split("#")[0];
        } catch (err) {
          log(`  site load issue: ${err?.message || err}`);
        } finally {
          if (popup) await popup.close().catch(() => {});
        }
      }

      if (websiteUrl) websiteUrl = stripTracking(websiteUrl);

      if (websiteUrl && !skipSiteReview) {
        siteReview = await reviewCompanySite(context, websiteUrl);
      }
    }

    await sleep(delayMs);
    return {
      companyName: companyName.replace(/\s+Reviews?$/i, "").trim(),
      websiteUrl,
      profileUrl,
      clutchUrl: profileUrl,
      siteReview,
      collectedAt: new Date().toISOString(),
    };
  } finally {
    await page.close().catch(() => {});
  }
}

function persistOutputs(state) {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(checkpointPath, JSON.stringify(state, null, 2), "utf8");
  writeFileSync(
    outPath,
    state.rows.map((r) => JSON.stringify(r)).join("\n") + (state.rows.length ? "\n" : ""),
    "utf8",
  );
  writeFileSync(
    csvPath,
    [
      "company,website,profile,services,grc_products,fit_hint,emails,phones,pages_fetched",
      ...state.rows.map((r) =>
        [
          csvEscape(r.companyName),
          csvEscape(r.websiteUrl ?? ""),
          csvEscape(r.profileUrl ?? ""),
          csvEscape((r.siteReview?.relevantServices || []).join("|")),
          csvEscape((r.siteReview?.existingGrcProducts || []).join("|")),
          csvEscape(r.siteReview?.fitHint ? "yes" : "no"),
          csvEscape((r.siteReview?.publishedEmails || []).join("|")),
          csvEscape((r.siteReview?.phones || []).join("|")),
          csvEscape(String(r.siteReview?.pagesFetched?.length ?? 0)),
        ].join(","),
      ),
    ].join("\n") + "\n",
    "utf8",
  );
  writeFileSync(
    pastePath,
    state.rows
      .map((r) => (r.websiteUrl ? `${r.companyName}, ${r.websiteUrl}` : r.companyName))
      .join("\n") + "\n",
    "utf8",
  );
}

async function main() {
  log(
    JSON.stringify({
      startUrl,
      outPath,
      headed,
      maxPages,
      maxProviders,
      delayMs,
      sitePathsMax,
      skipSiteReview,
      resume,
    }),
  );

  const state = {
    pageIdx: 1,
    browseUrl: startUrl,
    rows: [],
    seenProfiles: [],
    savedAt: null,
    status: "running",
  };

  if (resume && existsSync(checkpointPath)) {
    try {
      const prior = JSON.parse(readFileSync(checkpointPath, "utf8"));
      if (Array.isArray(prior.rows)) {
        state.rows = prior.rows;
        state.seenProfiles = prior.seenProfiles || prior.rows.map((r) => r.profileUrl);
        state.pageIdx = prior.pageIdx || 1;
        state.browseUrl = prior.browseUrl || startUrl;
        log(`resumed ${state.rows.length} rows; browseUrl=${state.browseUrl}`);
      }
    } catch (err) {
      log(`checkpoint load failed: ${err?.message || err}`);
    }
  }

  const seen = new Set(state.seenProfiles.filter(Boolean));

  const browser = await chromium.launch({
    headless: !headed,
    args: headed ? [] : ["--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    viewport: { width: 1400, height: 960 },
    locale: "en-US",
  });
  // Soften automation fingerprint a bit
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  const browse = await context.newPage();

  const baseDirectoryUrl = (() => {
    try {
      const u = new URL(startUrl);
      u.searchParams.delete("page");
      return u.toString();
    } catch {
      return startUrl;
    }
  })();

  try {
    let emptyOrNoNewStreak = 0;

    for (let pageIdx = state.pageIdx; pageIdx <= maxPages; pageIdx++) {
      const pageUrl = directoryUrlForPage(baseDirectoryUrl, pageIdx);
      state.pageIdx = pageIdx;
      state.browseUrl = pageUrl;

      log(`Opening directory page ${pageIdx}: ${pageUrl}`);
      await browse.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
      await dismissCookieBanner(browse);
      let listingsOk = await waitForClutchListings(browse);
      if (!listingsOk) {
        log(`Page ${pageIdx}: listings not ready — reload once`);
        await sleep(3000);
        await browse.reload({ waitUntil: "domcontentloaded" });
        await sleep(2500);
        listingsOk = await waitForClutchListings(browse);
      }
      if (!listingsOk) {
        emptyOrNoNewStreak += 1;
        log(`Page ${pageIdx}: empty/blocked (streak=${emptyOrNoNewStreak})`);
        if (pageIdx === state.pageIdx && state.rows.length === 0) {
          state.status = "blocked_or_empty";
          persistOutputs(state);
          log(
            "FATAL: Could not load Clutch listings (Cloudflare or empty). Re-run with --headed and complete any challenge, then --resume.",
          );
          await browser.close();
          process.exit(2);
        }
        if (emptyOrNoNewStreak >= 2) {
          log("Two empty pages in a row — directory walk complete.");
          state.status = "complete";
          break;
        }
        continue;
      }

      const profiles = await collectProviderProfileHrefs(browse);
      log(`page ${pageIdx}: ${profiles.length} provider profiles @ ${browse.url()}`);
      if (profiles.length === 0) {
        emptyOrNoNewStreak += 1;
        log(`No profiles on page ${pageIdx} (streak=${emptyOrNoNewStreak})`);
        if (emptyOrNoNewStreak >= 2) {
          log("Two empty pages in a row — directory walk complete.");
          state.status = "complete";
          break;
        }
        continue;
      }

      let newOnPage = 0;
      for (const profileUrl of profiles) {
        if (state.rows.length >= maxProviders) {
          log(`max-providers=${maxProviders} reached`);
          state.status = "max_providers";
          persistOutputs(state);
          await browser.close();
          return finish(state);
        }
        if (seen.has(profileUrl)) {
          continue;
        }

        let row;
        try {
          row = await resolveProvider(context, profileUrl);
        } catch (err) {
          log(`  ERROR ${profileUrl}: ${err?.message || err}`);
          seen.add(profileUrl);
          state.seenProfiles.push(profileUrl);
          continue;
        }

        seen.add(profileUrl);
        state.seenProfiles.push(profileUrl);
        state.rows.push(row);
        newOnPage += 1;
        log(
          `  + ${row.companyName} → ${row.websiteUrl ?? "(no site)"} | services=${(row.siteReview?.relevantServices || []).join("|") || "-"} | grc=${(row.siteReview?.existingGrcProducts || []).join("|") || "-"} | (${state.rows.length})`,
        );
        if (state.rows.length % 2 === 0) persistOutputs(state);
      }

      log(`page ${pageIdx}: added ${newOnPage} new (total ${state.rows.length})`);
      persistOutputs(state);

      if (newOnPage === 0) {
        emptyOrNoNewStreak += 1;
        log(`No new providers on page ${pageIdx} (streak=${emptyOrNoNewStreak})`);
        if (emptyOrNoNewStreak >= 2) {
          log("Two pages with no new providers — directory walk complete.");
          state.status = "complete";
          break;
        }
      } else {
        emptyOrNoNewStreak = 0;
      }
    }

    if (state.status === "running") state.status = "complete_max_pages";
  } catch (err) {
    state.status = "error";
    log(`FATAL: ${err?.message || err}`);
    persistOutputs(state);
    throw err;
  } finally {
    state.savedAt = new Date().toISOString();
    persistOutputs(state);
    await browser.close().catch(() => {});
  }

  return finish(state);
}

function finish(state) {
  const withSite = state.rows.filter((r) => r.websiteUrl).length;
  const fit = state.rows.filter((r) => r.siteReview?.fitHint).length;
  const summary = {
    status: state.status,
    collected: state.rows.length,
    withWebsite: withSite,
    fitHintYes: fit,
    jsonl: outPath,
    csv: csvPath,
    paste: pastePath,
    checkpoint: checkpointPath,
    log: logPath,
    next: "Paste .paste.txt into Ironleads (≤100/batch) → Import paste → Research only. Review CSV for HOLD/GRC conflicts (OSCAR/Radius360).",
  };
  log(JSON.stringify(summary, null, 2));
  return summary;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
