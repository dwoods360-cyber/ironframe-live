#!/usr/bin/env node
/**
 * Epic 11 — fail-closed scan of git-tracked files for committed PEM private keys and live credential shapes.
 * Does not scan .gitignored paths (e.g. .pki-provision/, .env*.local).
 */
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");

const TRACKED = execSync("git ls-files -z", { cwd: root, encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const SKIP_SUFFIX = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".woff",
  ".woff2",
  ".lock",
];

const BLOCK_PATTERNS = [
  { id: "PEM_PRIVATE_KEY", re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { id: "OPENAI_SK", re: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { id: "AWS_ACCESS_KEY", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: "GITHUB_PAT", re: /\bghp_[A-Za-z0-9]{36,}\b/ },
  { id: "NREL_LIVE_KEY", re: /\bapi_key=[A-Za-z0-9]{20,}\b/i },
];

/** Placeholder-only lines allowed in docs/templates. */
function isBenignLine(line) {
  const t = line.trim();
  if (!t) return true;
  if (t.includes("...") || t.includes("placeholder") || t.includes("not real")) return true;
  if (t.startsWith("#") && t.includes("BEGIN PUBLIC KEY")) return true;
  if (t.includes('""') || t.includes("''")) return true;
  return false;
}

const hits = [];

for (const rel of TRACKED) {
  if (SKIP_SUFFIX.some((s) => rel.endsWith(s))) continue;
  if (rel.startsWith("playwright-report/")) continue;

  const abs = join(root, rel);
  let content;
  try {
    content = readFileSync(abs, "utf8");
  } catch {
    continue;
  }

  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isBenignLine(line)) continue;
    for (const { id, re } of BLOCK_PATTERNS) {
      if (re.test(line)) {
        hits.push({ file: rel, line: i + 1, rule: id, sample: line.trim().slice(0, 120) });
      }
    }
  }
}

if (hits.length > 0) {
  console.error("[scan:secrets] FAIL — potential credential or private key material in git-tracked files:");
  for (const h of hits) {
    console.error(`  ${h.file}:${h.line} [${h.rule}] ${h.sample}`);
  }
  process.exit(1);
}

console.log(`[scan:secrets] OK — ${TRACKED.length} tracked paths scanned, no blocked patterns.`);
