#!/usr/bin/env node
/**
 * Installs the pre-commit hook that runs check-no-float-decimal.
 * Run once: npm run install-hooks  (or node scripts/install-pre-commit.mjs)
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const hooksDir = join(root, '.git', 'hooks');
const hookPath = join(hooksDir, 'pre-commit');

const hookContent = `#!/usr/bin/env sh
# Ironframe: No Float/Decimal in ALE or Financial files (TAS)
cd "$(git rev-parse --show-toplevel)" && node scripts/check-no-float-decimal.mjs || exit 1
`;

if (!existsSync(join(root, '.git', 'HEAD'))) {
  console.warn('Not a git repo; skipping pre-commit hook install.');
  process.exit(0);
}

mkdirSync(hooksDir, { recursive: true });
writeFileSync(hookPath, hookContent, 'utf8');
try {
  const { chmodSync } = await import('fs');
  chmodSync(hookPath, 0o755);
} catch (_) {
  // Windows may not need chmod
}
console.log('Pre-commit hook installed at .git/hooks/pre-commit (Float/Decimal check).');
process.exit(0);
