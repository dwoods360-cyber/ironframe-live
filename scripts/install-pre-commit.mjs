#!/usr/bin/env node
/**
 * Installs the Ironframe pre-commit hook:
 *  1) No float/decimal in ALE / financial files (TAS)
 *  2) Path-filtered product-knowledge drift check (hard block; no auto-sync)
 *
 * Run once: npm run install-hooks
 */

import { writeFileSync, mkdirSync, existsSync, chmodSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const hooksDir = join(root, '.git', 'hooks');
const hookPath = join(hooksDir, 'pre-commit');

const hookContent = `#!/usr/bin/env sh
# Ironframe pre-commit — defense-in-depth local guards (never auto-modify staged files)
set -e
cd "$(git rev-parse --show-toplevel)" || exit 1

# 1) TAS: no float/decimal in financial / ALE paths
node scripts/check-no-float-decimal.mjs || exit 1

# 2) GTM product knowledge: check-only hard block when blast-radius paths are staged
node scripts/pre-commit-knowledge-check.mjs || exit 1
`;

if (!existsSync(join(root, '.git', 'HEAD'))) {
  console.warn('Not a git repo; skipping pre-commit hook install.');
  process.exit(0);
}

mkdirSync(hooksDir, { recursive: true });
writeFileSync(hookPath, hookContent, 'utf8');
try {
  chmodSync(hookPath, 0o755);
} catch {
  // Windows may not need chmod
}

console.log('Pre-commit hook installed at .git/hooks/pre-commit');
console.log('  • check-no-float-decimal.mjs');
console.log('  • pre-commit-knowledge-check.mjs (path-filtered; no auto-sync)');
process.exit(0);
