/**
 * Walk a Clutch cybersecurity listing, import 100 SUSPECTs, then next page,
 * until the directory ends. Operator machine only — not Vercel / not cron.
 *
 * Listing cards only (firm name + Clutch profile). Company websites are
 * optional; Research later probes them. Cloudflare usually needs --headed.
 *
 *   npx playwright install chromium
 *   node scripts/dev/clutch-import-directory-pages.mjs --headed
 *   node scripts/dev/clutch-import-directory-pages.mjs --headed --start-page=2
 *   node scripts/dev/clutch-import-directory-pages.mjs --headed --dry-run --max-pages=2
 *
 * Default listing: https://clutch.co/it-services/cybersecurity
 * Import uses .env.production.cutover.local when present, else .env.local.
 */

import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  appendFileSync,
  readFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

function arg(name, fallback = null) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  if (process.argv.includes(`--${name}`)) return true;
  return fallback;
}

const DEFAULT_START = "https://clutch.co/it-services/cybersecurity";
const startUrl = String(arg("start-url", DEFAULT_START));
const startPage = Math.max(1, Number(arg("start-page", "1")) || 1);
const importBatch = Math.max(1, Math.min(1000, Number(arg("import-batch", "100")) || 100));
const maxPages = Math.max(1, Number(arg("max-pages", "80")) || 80);
const delayMs = Math.max(800, Number(arg("delay-ms", "2500")) || 2500);
const headed = Boolean(arg("headed", false));
const dryRun = Boolean(arg("dry-run", false));
const resume = Boolean(arg("resume", false));

const outDir = resolve("scripts/dev/out");
const pastePath = resolve(outDir, "clutch-it-services-cybersecurity.paste.txt");
const checkpointPath = resolve(
  outDir,
  "clutch-it-services-cybersecurity.import.checkpoint.json",
);
const logPath = resolve(outDir, "clutch-it-services-cybersecurity.import.log");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function log(line) {
  const msg = `[${new Date().toISOString()}] ${line}`;
  console.log(msg);
  try {
    mkdirSync(outDir, { recursive: true });
    appendFileSync(logPath, `${msg}\n`, "utf8");
  } catch {
    /* ignore */
  }
}

function directoryUrlForPage(baseUrl, pageNum) {
  const u = new URL(baseUrl);
  if (pageNum <= 1) u.searchParams.delete("page");
  else u.searchParams.set("page", String(pageNum));
  return u.toString();
}

async function dismissCookieBanner(page) {
  const candidates = [
    page.getByRole("button", { name: /accept all|accept|agree|got it|allow all|ok/i }),
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

async function waitForClutchListings(page) {
  for (let attempt = 0; attempt < 24; attempt++) {
    const body = ((await page.textContent("body").catch(() => "")) || "").toLowerCase();
    if (
      body.includes("just a moment") ||
      body.includes("performing security verification") ||
      body.includes("checking your browser")
    ) {
      log(`Cloudflare challenge visible (attempt ${attempt + 1}) — complete it in the window`);
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
    await sleep(350);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(300);
}

async function collectListingFirms(page) {
  await scrollDirectory(page);
  return page.evaluate(() => {
    const out = [];
    const seen = new Set();
    const links = document.querySelectorAll(
      "a.directory_profile, a.provider__cta-link[href*='/profile/'], a[href*='/profile/']",
    );
    for (const a of links) {
      const href = String(a.href || "")
        .split("?")[0]
        .split("#")[0];
      if (!/clutch\.co\/profile\//i.test(href)) continue;
      if (seen.has(href)) continue;
      let name = String(a.getAttribute("title") || a.textContent || "")
        .replace(/\s+/g, " ")
        .replace(/view profile/gi, "")
        .replace(/\s+reviews?$/i, "")
        .trim();
      const card = a.closest("li, article, .provider, [class*='provider']");
      if ((!name || name.length < 2) && card) {
        const h = card.querySelector("h3, h2, .provider__title, [class*='company']");
        name = String(h?.textContent || "")
          .replace(/\s+/g, " ")
          .replace(/\s+reviews?$/i, "")
          .trim();
      }
      if (!name || name.length < 2 || /view profile/i.test(name)) continue;
      seen.add(href);
      out.push({ companyName: name, profileUrl: href });
    }
    return out;
  });
}

function envFile() {
  if (existsSync(resolve(".env.production.cutover.local"))) {
    return ".env.production.cutover.local";
  }
  return ".env.local";
}

function importChunk(rows) {
  return new Promise((resolvePromise, reject) => {
    mkdirSync(outDir, { recursive: true });
    const chunkPath = resolve(outDir, "clutch-import-chunk.paste.txt");
    writeFileSync(
      chunkPath,
      rows.map((r) => r.companyName).join("\n") + "\n",
      "utf8",
    );
    const importer = resolve("scripts/dev/import-msspproviders-paste-file.ts");
    const child = spawn(
      "npx",
      [
        "tsx",
        `--env-file=${envFile()}`,
        importer,
        chunkPath,
        "--source=clutch_public",
      ],
      { stdio: "inherit", cwd: resolve("."), shell: true, env: process.env },
    );
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`import chunk exited ${code}`));
    });
  });
}

function persistCheckpoint(state) {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(checkpointPath, JSON.stringify(state, null, 2), "utf8");
  writeFileSync(
    pastePath,
    state.imported
      .concat(state.pending)
      .map((r) => r.companyName)
      .join("\n") + "\n",
    "utf8",
  );
}

async function main() {
  let base;
  try {
    const u = new URL(startUrl);
    u.searchParams.delete("page");
    base = u.toString();
  } catch {
    base = DEFAULT_START;
  }

  const state = {
    startUrl: base,
    pageIdx: startPage,
    imported: [],
    pending: [],
    seenProfiles: [],
    status: "running",
    dryRun,
    importBatch,
  };

  if (resume && existsSync(checkpointPath)) {
    try {
      const prior = JSON.parse(readFileSync(checkpointPath, "utf8"));
      if (Array.isArray(prior.imported)) state.imported = prior.imported;
      if (Array.isArray(prior.pending)) state.pending = prior.pending;
      if (Array.isArray(prior.seenProfiles)) state.seenProfiles = prior.seenProfiles;
      if (typeof prior.pageIdx === "number") state.pageIdx = prior.pageIdx;
      log(
        `resumed imported=${state.imported.length} pending=${state.pending.length} page=${state.pageIdx}`,
      );
    } catch (err) {
      log(`checkpoint load failed: ${err?.message || err}`);
    }
  }

  const seen = new Set(state.seenProfiles);
  for (const row of [...state.imported, ...state.pending]) {
    if (row.profileUrl) seen.add(row.profileUrl);
  }

  log(
    JSON.stringify({
      startUrl: base,
      startPage,
      importBatch,
      maxPages,
      headed,
      dryRun,
      envFile: envFile(),
    }),
  );

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
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  const page = await context.newPage();

  let emptyStreak = 0;
  try {
    for (let pageIdx = state.pageIdx; pageIdx < startPage + maxPages; pageIdx++) {
      const pageUrl = directoryUrlForPage(base, pageIdx);
      state.pageIdx = pageIdx;
      log(`Opening Clutch page ${pageIdx}: ${pageUrl}`);
      await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await dismissCookieBanner(page);
      let ok = await waitForClutchListings(page);
      if (!ok) {
        await sleep(3000);
        await page.reload({ waitUntil: "domcontentloaded" });
        await sleep(2000);
        ok = await waitForClutchListings(page);
      }
      if (!ok) {
        emptyStreak += 1;
        log(`Page ${pageIdx}: empty/blocked (streak=${emptyStreak})`);
        persistCheckpoint(state);
        if (emptyStreak >= 2) {
          state.status = pageIdx === startPage ? "blocked_or_empty" : "complete";
          break;
        }
        continue;
      }

      const firms = await collectListingFirms(page);
      let newOnPage = 0;
      for (const firm of firms) {
        if (seen.has(firm.profileUrl)) continue;
        seen.add(firm.profileUrl);
        state.seenProfiles.push(firm.profileUrl);
        state.pending.push(firm);
        newOnPage += 1;
      }
      log(
        `page ${pageIdx}: ${firms.length} cards, ${newOnPage} new, pending=${state.pending.length}, imported=${state.imported.length}`,
      );

      while (state.pending.length >= importBatch) {
        const chunk = state.pending.splice(0, importBatch);
        if (dryRun) {
          log(`[dry-run] would import ${chunk.length}: ${chunk.map((c) => c.companyName).slice(0, 8).join(", ")}…`);
        } else {
          log(`Importing ${chunk.length} firms…`);
          await importChunk(chunk);
        }
        state.imported.push(...chunk);
        persistCheckpoint(state);
      }

      persistCheckpoint(state);
      if (newOnPage === 0) {
        emptyStreak += 1;
        if (emptyStreak >= 2) {
          log("Two pages with no new firms — directory walk complete.");
          state.status = "complete";
          break;
        }
      } else {
        emptyStreak = 0;
      }
      await sleep(delayMs);
    }

    if (state.pending.length > 0) {
      if (dryRun) {
        log(`[dry-run] leftover ${state.pending.length} not imported`);
      } else {
        log(`Importing leftover ${state.pending.length} firms…`);
        await importChunk(state.pending);
        state.imported.push(...state.pending);
        state.pending = [];
      }
    }
    if (state.status === "running") state.status = "complete_max_pages";
  } finally {
    persistCheckpoint(state);
    await browser.close().catch(() => {});
  }

  log(
    JSON.stringify(
      {
        status: state.status,
        imported: state.imported.length,
        pending: state.pending.length,
        lastPage: state.pageIdx,
        paste: pastePath,
        next:
          state.status === "complete" || state.status === "complete_max_pages"
            ? "Research only on the new SUSPECTs. Overflow sits in pending pool (active cap 20)."
            : "Re-run with --headed --resume after Cloudflare.",
      },
      null,
      2,
    ),
  );
  if (state.status === "blocked_or_empty") process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
