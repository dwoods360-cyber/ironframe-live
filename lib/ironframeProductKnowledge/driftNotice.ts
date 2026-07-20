/**
 * Persistent drift latch for Ops Hub floating notice + loud pre-commit feedback.
 * File is gitignored — local operator state only.
 */
import fs from 'node:fs';
import path from 'node:path';

import { DRIFT_NOTICE_REL } from './syncManifest';

export type ProductKnowledgeDriftNotice = {
  version: 1;
  active: true;
  detectedAt: string;
  source: 'pre-commit' | 'knowledge-check' | 'ops-hub' | 'cli';
  summary: string;
  resolveHint: string;
  opsHubPath: string;
};

function noticeAbs(): string {
  return path.join(process.cwd(), DRIFT_NOTICE_REL);
}

export function readDriftNotice(): ProductKnowledgeDriftNotice | null {
  const p = noticeAbs();
  if (!fs.existsSync(p)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(p, 'utf8')) as ProductKnowledgeDriftNotice;
    if (parsed?.active !== true) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeDriftNotice(opts: {
  source: ProductKnowledgeDriftNotice['source'];
  summary?: string;
}): ProductKnowledgeDriftNotice {
  const notice: ProductKnowledgeDriftNotice = {
    version: 1,
    active: true,
    detectedAt: new Date().toISOString(),
    source: opts.source,
    summary:
      opts.summary ??
      'GTM / product knowledge drift detected — commercial spine or sales-enablement mirrors are out of sync.',
    resolveHint:
      'Open Ops Hub → Sync product knowledge, or run: npm run knowledge:sync',
    opsHubPath: '/dashboard/operations',
  };
  const p = noticeAbs();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(notice, null, 2)}\n`, 'utf8');
  return notice;
}

export function clearDriftNotice(): void {
  const p = noticeAbs();
  if (fs.existsSync(p)) {
    try {
      fs.unlinkSync(p);
    } catch {
      // ignore
    }
  }
}

/** Loud terminal banner — hard to scroll past on failed pre-commit / CLI check. */
export function printDriftTerminalBanner(opts?: { openOpsHub?: boolean }): void {
  const line = '═'.repeat(72);
  const msg = [
    '',
    `\x1b[41;97m${line}\x1b[0m`,
    '\x1b[41;97m  KNOWLEDGE DRIFT DETECTED — COMMIT / MERGE BLOCKED                          \x1b[0m',
    `\x1b[41;97m${line}\x1b[0m`,
    '',
    '\x1b[91m  Do not ignore this. Product knowledge is out of sync.\x1b[0m',
    '',
    '\x1b[97m  Resolve (human apply — never auto-staged):\x1b[0m',
    '\x1b[96m    1. npm run knowledge:sync\x1b[0m',
    '\x1b[96m    2. git add docs/sales-enablement lib/ironframeProductKnowledge/.fingerprint.json\x1b[0m',
    '\x1b[96m    3. git commit\x1b[0m',
    '',
    '\x1b[97m  Or one-click in Ops Hub:\x1b[0m',
    '\x1b[96m    http://127.0.0.1:3000/dashboard/operations  →  Sync product knowledge\x1b[0m',
    '',
    '\x1b[93m  A floating notice will also appear in Ops Hub until sync succeeds.\x1b[0m',
    '',
    `\x1b[41;97m${line}\x1b[0m`,
    '',
  ].join('\n');
  console.error(msg);
  void opts;
}
