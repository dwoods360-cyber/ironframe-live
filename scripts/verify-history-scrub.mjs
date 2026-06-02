#!/usr/bin/env node
/**
 * Post git-filter-repo verification — scans all git refs for known leak patterns.
 * Usage: node scripts/verify-history-scrub.mjs
 * Exit 0 = clean; exit 1 = potential leaks remain (review hits).
 */
import { execSync } from "node:child_process";

const BLOCKED = [
  { id: "supabase-pooler-host", pattern: "postgres\\.kcuciq" },
  { id: "supabase-ref-kcuciq", pattern: "kcuciqpxxrqjmqcpulmq" },
  { id: "supabase-ref-nbplj", pattern: "nbpljqueahmbwgxlnkpv" },
  { id: "supabase-jwt-header", pattern: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" },
  { id: "prisma-local-api-key-blob", pattern: "prisma\\+postgres://localhost:51213" },
];

function git(cmd) {
  return execSync(cmd, { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 }).trim();
}

const SAFE_PATH_SUFFIXES = [
  "scripts/build-secrets-replacements.mjs",
  "scripts/verify-history-scrub.mjs",
];

function pathIsScrubTooling(filePath) {
  if (SAFE_PATH_SUFFIXES.some((s) => filePath.endsWith(s))) return true;
  if (filePath.includes("supabase/migrations/")) return true;
  return false;
}

function commitTouchesPatternOnlyInSafePaths(sha, pattern) {
  try {
    const files = git(`git grep -l -E "${pattern}" ${sha}`).split("\n").filter(Boolean);
    if (files.length === 0) return true;
    return files.every((f) => pathIsScrubTooling(f));
  } catch {
    return true;
  }
}

function scanRegexHistory(pattern) {
  try {
    const branch = process.env.SCRUB_VERIFY_REF?.trim() || "main";
    const out = git(`git log ${branch} -G "${pattern}" --pretty=format:%H`);
    if (!out) return { hits: 0, sample: [] };
    const shas = out.split("\n").filter(Boolean);
    const dirty = shas.filter((sha) => !commitTouchesPatternOnlyInSafePaths(sha, pattern));
    const sample = dirty.slice(0, 5).map((sha) => git(`git log -1 --oneline ${sha}`));
    return { hits: dirty.length, sample };
  } catch {
    return { hits: 0, sample: [] };
  }
}

function scanTrackedDotEnv() {
  try {
    const branch = process.env.SCRUB_VERIFY_REF?.trim() || "main";
    const out = git(`git log ${branch} --oneline -- .env`);
    if (!out) return { hits: 0, sample: [] };
    const lines = out.split("\n").filter(Boolean);
    return { hits: lines.length, sample: lines.slice(0, 5) };
  } catch {
    return { hits: 0, sample: [] };
  }
}

function main() {
  console.log(`[verify-history-scrub] Scanning branch '${process.env.SCRUB_VERIFY_REF?.trim() || "main"}'…\n`);
  const failures = [];

  for (const { id, pattern } of BLOCKED) {
    const { hits, sample } = scanRegexHistory(pattern);
    const status = hits === 0 ? "OK" : "FAIL";
    console.log(`  [${status}] ${id}: ${hits} commit(s) touching pattern`);
    for (const s of sample) console.log(`         ${s}`);
    if (hits > 0) failures.push(id);
  }

  const dotEnv = scanTrackedDotEnv();
  const dotEnvStatus = dotEnv.hits === 0 ? "OK" : "FAIL";
  console.log(`  [${dotEnvStatus}] tracked-dot-env-path: ${dotEnv.hits} commit(s) on .env`);
  for (const s of dotEnv.sample) console.log(`         ${s}`);
  if (dotEnv.hits > 0) failures.push("tracked-dot-env-path");

  console.log("");
  if (failures.length === 0) {
    console.log("[verify-history-scrub] PASS — no blocked patterns in git history.");
    process.exit(0);
  }

  console.error(
    `[verify-history-scrub] FAIL — ${failures.length} check(s) still dirty: ${failures.join(", ")}`,
  );
  console.error("Extend secrets-replacements.txt and re-run git filter-repo.");
  process.exit(1);
}

main();
