/**
 * Shepherd: run clutch-collect-websites.mjs until status is terminal,
 * auto-resuming from checkpoint after crashes / Cloudflare blips.
 *
 *   node scripts/dev/clutch-shepherd.mjs --headed
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const checkpoint = resolve("scripts/dev/out/clutch-cybersecurity.checkpoint.json");
const collector = resolve("scripts/dev/clutch-collect-websites.mjs");

const TERMINAL = new Set([
  "complete",
  "complete_max_pages",
  "max_providers",
  "blocked_or_empty",
]);

function argPassthrough() {
  return process.argv.slice(2).filter((a) => a !== "--fresh");
}

function readStatus() {
  if (!existsSync(checkpoint)) return null;
  try {
    return JSON.parse(readFileSync(checkpoint, "utf8"));
  } catch {
    return null;
  }
}

function runOnce(extraArgs) {
  return new Promise((resolvePromise) => {
    const args = [collector, ...extraArgs];
    console.log(`[shepherd] spawn: node ${args.join(" ")}`);
    const child = spawn(process.execPath, args, {
      stdio: "inherit",
      cwd: resolve("."),
      env: process.env,
    });
    child.on("exit", (code) => resolvePromise(code ?? 1));
  });
}

async function main() {
  const passthrough = argPassthrough();
  let attempt = 0;
  const maxAttempts = 40;

  while (attempt < maxAttempts) {
    attempt += 1;
    const prior = readStatus();
    const resume =
      prior && Array.isArray(prior.rows) && prior.rows.length > 0
        ? ["--resume"]
        : [];
    const code = await runOnce([...passthrough, ...resume]);
    const state = readStatus();
    const status = state?.status || "unknown";
    const collected = state?.rows?.length ?? 0;
    console.log(
      `[shepherd] attempt=${attempt} exit=${code} status=${status} collected=${collected}`,
    );

    if (TERMINAL.has(status)) {
      console.log(`[shepherd] DONE status=${status} collected=${collected}`);
      process.exit(status === "blocked_or_empty" ? 2 : 0);
    }

    // Crash / Cloudflare — wait and resume
    console.log("[shepherd] non-terminal — waiting 20s then resume…");
    await new Promise((r) => setTimeout(r, 20_000));
  }

  console.error("[shepherd] gave up after max attempts");
  process.exit(1);
}

main();
