#!/usr/bin/env node
/**
 * Pre-commit local guard — path-filtered product-knowledge drift check.
 * Hard-blocks the commit on drift; never auto-applies mirrors (human must run knowledge:sync).
 *
 * Invoked from .git/hooks/pre-commit via npm run install-hooks.
 */
import { execSync, spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Staged paths that touch the commercial / GTM knowledge blast radius. */
const KNOWLEDGE_PATH_PATTERNS = [
  /^lib\/ironframeProductKnowledge\//,
  /^docs\/sales\//,
  /^docs\/sales-enablement\//,
  /^SalesTeam\/src\/(config\/|agents\/outboundDraftsman\.ts)/,
  /^Ironleads\/src\/knowledge\//,
  /^SuccessTeam\/src\/knowledge\//,
  /^SupportTeam\/src\/knowledge\//,
  /^Ironboard\/src\/(staticContext\.ts|index\.ts|config\/designPartnerLaunchBriefing\.ts)/,
  /^app\/lib\/server\/opsWorkerChatCore\.ts$/,
  /^scripts\/sync-product-knowledge\.ts$/,
  /^scripts\/pre-commit-knowledge-check\.mjs$/,
  /^tests\/unit\/(ironframeProductKnowledge|productKnowledgeSync)\.test\.ts$/,
];

function stagedFiles() {
  try {
    const out = execSync('git diff --cached --name-only --diff-filter=ACMR', {
      cwd: root,
      encoding: 'utf8',
    });
    return out
      .split(/\r?\n/)
      .map((s) => s.trim().replace(/\\/g, '/'))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function touchesKnowledgeBlastRadius(files) {
  return files.some((f) => KNOWLEDGE_PATH_PATTERNS.some((re) => re.test(f)));
}

function writeDriftNoticeLatch() {
  const noticePath = join(root, 'lib/ironframeProductKnowledge/.drift-notice.json');
  mkdirSync(dirname(noticePath), { recursive: true });
  writeFileSync(
    noticePath,
    `${JSON.stringify(
      {
        version: 1,
        active: true,
        detectedAt: new Date().toISOString(),
        source: 'pre-commit',
        summary:
          'GTM / product knowledge drift detected during pre-commit — commit blocked.',
        resolveHint:
          'Open Ops Hub → Sync product knowledge, or run: npm run knowledge:sync',
        opsHubPath: '/dashboard/operations',
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
}

function printLoudBanner() {
  const line = '='.repeat(72);
  console.error(`
\x1b[41;97m${line}\x1b[0m
\x1b[41;97m  KNOWLEDGE DRIFT DETECTED — COMMIT BLOCKED                                 \x1b[0m
\x1b[41;97m${line}\x1b[0m

\x1b[91m  Do not scroll past this. Product knowledge is out of sync.\x1b[0m

\x1b[97m  Resolve (explicit human apply — never auto-staged):\x1b[0m
\x1b[96m    npm run knowledge:sync\x1b[0m
\x1b[96m    git add docs/sales-enablement lib/ironframeProductKnowledge/.fingerprint.json\x1b[0m
\x1b[96m    git commit\x1b[0m

\x1b[97m  Or one-click in Ops Hub (floating notice will appear):\x1b[0m
\x1b[96m    http://127.0.0.1:3000/dashboard/operations  →  Sync product knowledge\x1b[0m

\x1b[93m  CI will also hard-fail if you bypass with --no-verify.\x1b[0m

\x1b[41;97m${line}\x1b[0m
`);
}

const files = stagedFiles();
if (!touchesKnowledgeBlastRadius(files)) {
  process.exit(0);
}

console.log('[pre-commit] Product knowledge blast-radius paths staged — running knowledge:check…');

const result = spawnSync('npx', ['tsx', 'scripts/sync-product-knowledge.ts'], {
  cwd: root,
  encoding: 'utf8',
  shell: true,
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.status !== 0) {
  writeDriftNoticeLatch();
  printLoudBanner();
  process.exit(1);
}

console.log('[pre-commit] Product knowledge check OK.');
process.exit(0);
