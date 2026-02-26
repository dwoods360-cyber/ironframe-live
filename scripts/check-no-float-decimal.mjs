#!/usr/bin/env node
/**
 * Pre-commit / Lint: Scans ALE and Financial-related files for forbidden Float or Decimal.
 * Per .cursorrules and TAS: All USD/ALE must use BIGINT cents. If found, exits 1 and kills the process.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');

const PATTERNS = [
  /\bFloat\b/,
  /\bDecimal\b/,
];

// Files and dirs that are ALE or Financial-related (per TAS)
const SCAN_PATHS = [
  'prisma/schema.prisma',
  'prisma-dmz/schema.prisma',
  'core/irontrust/ale-engine.ts',
  'core/irontrust/ale-engine.test.ts',
];

function scanFile(filePath) {
  const fullPath = join(root, filePath);
  if (!existsSync(fullPath)) return [];
  const content = readFileSync(fullPath, 'utf8');
  const lines = content.split(/\r?\n/);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const re of PATTERNS) {
      if (re.test(line)) {
        hits.push({ file: filePath, line: i + 1, text: line.trim() });
      }
    }
  }
  return hits;
}

const allHits = [];
for (const p of SCAN_PATHS) {
  allHits.push(...scanFile(p));
}

if (allHits.length > 0) {
  console.error('\n\u274c FORBIDDEN: Float or Decimal in ALE/Financial scope (.cursorrules / TAS). Use BIGINT cents only.\n');
  for (const { file, line, text } of allHits) {
    console.error(`  ${file}:${line}  ${text}`);
  }
  console.error('\nPre-commit aborted. Fix or request a TAS Amendment.\n');
  process.exit(1);
}

process.exit(0);
