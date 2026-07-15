#!/usr/bin/env node
/**
 * Pre-commit / Lint: Scans ALE and financial money paths for forbidden Float or Decimal.
 * Per .cursorrules and TAS: USD / ALE must use BIGINT cents.
 *
 * Physical ESG units (kWh, liters, gCO2) and non-money scores may legitimately use Float —
 * those are not flagable ALE money fields.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');

const TYPE_PATTERNS = [/\bFloat\b/, /\bDecimal\b/];

/** Field/line must also look like money / ALE to fail (schema-wide Float for kWh is OK). */
const MONEY_HINT =
  /\b(usd|cents?|ale|annualized|loss.?expect|currency|billing|mrr|arr|price|amount|revenue|cost)\b/i;

const SCAN_PATHS = [
  { path: 'prisma/schema.prisma', moneyOnly: true },
  { path: 'core/irontrust/ale-engine.ts', moneyOnly: false },
  { path: 'core/irontrust/ale-engine.test.ts', moneyOnly: false },
];

function scanFile(filePath, moneyOnly) {
  const fullPath = join(root, filePath);
  if (!existsSync(fullPath)) return [];
  const content = readFileSync(fullPath, 'utf8');
  const lines = content.split(/\r?\n/);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hasForbiddenType = TYPE_PATTERNS.some((re) => re.test(line));
    if (!hasForbiddenType) continue;
    if (moneyOnly && !MONEY_HINT.test(line)) continue;
    hits.push({ file: filePath, line: i + 1, text: line.trim() });
  }
  return hits;
}

const allHits = [];
for (const entry of SCAN_PATHS) {
  allHits.push(...scanFile(entry.path, entry.moneyOnly));
}

if (allHits.length > 0) {
  console.error(
    '\n\u274c FORBIDDEN: Float or Decimal in ALE/Financial money scope (.cursorrules / TAS). Use BIGINT cents only.\n',
  );
  for (const { file, line, text } of allHits) {
    console.error(`  ${file}:${line}  ${text}`);
  }
  console.error('\nPre-commit aborted. Fix or request a TAS Amendment.\n');
  process.exit(1);
}

process.exit(0);
