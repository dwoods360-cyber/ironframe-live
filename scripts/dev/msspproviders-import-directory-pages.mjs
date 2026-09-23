/**
 * Walk MSSPProviders.io browse, import 100 SUSPECTs, then next page,
 * until the directory ends. Operator machine only — not Vercel / not cron.
 *
 * Listing cards only (firm name + profile). Websites optional; Research later
 * probes them. Check MSSPProviders terms before large runs.
 *
 *   npx playwright install chromium
 *   node scripts/dev/msspproviders-import-directory-pages.mjs --headed
 *   node scripts/dev/msspproviders-import-directory-pages.mjs --headed --start-page=2
 *   node scripts/dev/msspproviders-import-directory-pages.mjs --headed --dry-run --max-pages=2
 *
 * Default listing: https://msspproviders.io/browse/
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
import { resolve } from "node:path";
import { chromium } from "playwright";

function arg(name, fallback = null) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  if (process.argv.includes(`--${name}`)) return true;
  return fallback;
}

const DEFAULT_START = "https://msspproviders.io/browse/";
const startUrl = String(arg("start-url", DEFAULT_START));
const startPage = Math.max(1, Number(arg("start-page", "1")) || 1);
const importBatch = Math.max(1, Math.min(1000, Number(arg("import-batch", "100")) || 100));
const maxPages = Math.max(1, Number(arg("max-pages", "40")) || 40);
const delayMs = Math.max(800, Number(arg("delay-ms", "2000")) || 2000);
const headed = Boolean(arg("headed", false));
const dryRun = Boolean(arg("dry-run", false));
const resume = Boolean(arg("resume", false));

const outDir = resolve("scripts/dev/out");
const pastePath = resolve(outDir, "msspproviders-browse.paste.txt");
const checkpointPath = resolve(outDir, "msspproviders-browse.import.checkpoint.json");
const logPath = resolve(outDir, "msspproviders-browse.import.log");

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

async function waitForListings(page) {
  for (let attempt = 0; attempt < 16; attempt++) {
    const n = await page
      .locator('a[href*="/provider/"]')
      .count()
      .catch(() => 0);
    if (n > 0) return true;
    await sleep(800);
  }
  return false;
}

async function collectListingFirms(page) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(400);
  await page.evaluate(() => window.scrollTo(0, 0));
  return page.evaluate(() => {
    const out = [];
    const seen = new Set();
    const links = Array.from(document.querySelectorAll('a[href*="/provider/"]'));
    for (const a of links) {
      let href = "";
      try {
        href = new URL(a.getAttribute("href") || "", location.origin).href
          .split("?")[0]
          .split("#")[0];
      } catch {
        continue;
      }
      if (!/\/provider\/[a-z0-9][a-z0-9-]*\/?$/i.test(href)) continue;
      if (seen.has(href)) continue;
      const card = a.closest("article, li, section, [class*='card'], [class*='provider']") || a;
      let name = "";
      const h = card.querySelector?.("h2, h3, h4");
      name = String(h?.textContent || "")
        .replace(/\s+/g, " ")
        .trim();
      if (!name) {
        const text = String(a.textContent || card.textContent || "")
          .replace(/\s+/g, " ")
          .trim();
        const m = text.match(/^(.+?)(?:Verified|Best for|logo|View provider|Serves:)/i);
        name = (m?.[1] || "").trim();
      }
      name = name.replace(/\s+logo$/i, "").replace(/^Verified\s+/i, "").trim();
      if (!name || name.length < 2) {
        const slug = (href.match(/\/provider\/([^/]+)\/?$/) || [])[1] || "";
        name = slug
          .split("-")
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
      }
      if (!name || /^(browse|providers|view provider)$/i.test(name)) continue;
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
    const chunkPath = resolve(outDir, "msspproviders-import-chunk.paste.txt");
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
        "--source=msspproviders_public",
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

  const browser = await chromium.launch({ headless: !headed });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  let emptyStreak = 0;
  try {
    for (let pageIdx = state.pageIdx; pageIdx < startPage + maxPages; pageIdx++) {
      const pageUrl = directoryUrlForPage(base, pageIdx);
      state.pageIdx = pageIdx;
      log(`Opening MSSPProviders page ${pageIdx}: ${pageUrl}`);
      await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await dismissCookieBanner(page);
      const ok = await waitForListings(page);
      if (!ok) {
        emptyStreak += 1;
        log(`Page ${pageIdx}: no View provider links (streak=${emptyStreak})`);
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
          log(
            `[dry-run] would import ${chunk.length}: ${chunk
              .map((c) => c.companyName)
              .slice(0, 8)
              .join(", ")}…`,
          );
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
            : "Re-run with --headed --resume.",
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
