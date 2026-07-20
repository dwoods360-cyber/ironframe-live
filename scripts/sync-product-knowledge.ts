#!/usr/bin/env npx tsx
/**
 * Automated product-knowledge diff check + mirror update + blast-radius report.
 *
 * Usage:
 *   npx tsx scripts/sync-product-knowledge.ts           # check only (exit 1 on drift)
 *   npx tsx scripts/sync-product-knowledge.ts --apply   # rewrite enablement mirrors + fingerprint
 *   npx tsx scripts/sync-product-knowledge.ts --json    # machine-readable report
 *
 * npm:
 *   npm run knowledge:check
 *   npm run knowledge:sync
 */
import {
  formatSyncReport,
  runProductKnowledgeSync,
} from '../lib/ironframeProductKnowledge/syncEngine';
import { printDriftTerminalBanner } from '../lib/ironframeProductKnowledge/driftNotice';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const asJson = args.has('--json');

const report = runProductKnowledgeSync({ apply });

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(formatSyncReport(report));
  if (apply && report.ok) {
    console.log('\nNext: restart/redeploy blast-radius targets, then npm run test:product-knowledge');
  }
  if (!apply && !report.ok) {
    printDriftTerminalBanner();
    console.log('Fix: npm run knowledge:sync   # applies fixable mirror updates');
    console.log('Or:  Ops Hub → Sync product knowledge (floating notice)');
  }
}

process.exit(report.ok ? 0 : 1);
