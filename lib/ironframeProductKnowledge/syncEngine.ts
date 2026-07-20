/**
 * Diff + sync engine for Ironframe product knowledge.
 * - Diff commercial spine fingerprint vs last apply
 * - Diff docs/sales ↔ docs/sales-enablement mirrors
 * - Scan for stale Path B / GA literals that disagree with commercial.ts
 * - --apply: rewrite mirrors from sources, update fingerprint, report blast radius
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import {
  DESIGN_PARTNER_PATH_B_CENTS,
  DESIGN_PARTNER_PATH_B_USD,
  PLANNED_GA_COMMAND_CENTS,
  PLANNED_GA_COMMAND_USD,
  PLANNED_GA_GROWTH_CENTS,
  PLANNED_GA_GROWTH_USD,
  formatPathBUsd,
  formatPlannedGaCommandUsd,
} from './commercial';
import {
  ENABLEMENT_ONLY_DOCS,
  FINGERPRINT_REL,
  PRODUCT_KNOWLEDGE_BLAST_RADIUS,
  PRODUCT_KNOWLEDGE_MIRRORS,
  type BlastRadiusTarget,
  type MirrorPair,
} from './syncManifest';
import { clearDriftNotice, writeDriftNotice } from './driftNotice';
export type DiffFinding = {
  id: string;
  severity: 'error' | 'warn' | 'info';
  message: string;
  path?: string;
  fixable: boolean;
};

export type SyncReport = {
  ok: boolean;
  spineChanged: boolean;
  findings: DiffFinding[];
  mirrors: Array<{
    id: string;
    sourceRel: string;
    targetRel: string;
    status: 'in_sync' | 'drift' | 'missing_source' | 'missing_target' | 'updated';
  }>;
  blastRadius: BlastRadiusTarget[];
  commercialAnchors: {
    pathBUsd: number;
    pathBCents: string;
    gaCommandUsd: number;
    gaCommandCents: string;
    gaGrowthUsd: number;
    gaGrowthCents: string;
  };
  applied: string[];
};

export type Fingerprint = {
  version: 1;
  updatedAt: string;
  commercialSha256: string;
  anchors: SyncReport['commercialAnchors'];
};

function rootDir(): string {
  return process.cwd();
}

function abs(rel: string): string {
  return path.join(rootDir(), rel);
}

function readOptional(rel: string): string | null {
  const p = abs(rel);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
}

function writeRel(rel: string, body: string): void {
  const p = abs(rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, body.endsWith('\n') ? body : `${body}\n`, 'utf8');
}

export function commercialAnchors(): SyncReport['commercialAnchors'] {
  return {
    pathBUsd: DESIGN_PARTNER_PATH_B_USD,
    pathBCents: DESIGN_PARTNER_PATH_B_CENTS,
    gaCommandUsd: PLANNED_GA_COMMAND_USD,
    gaCommandCents: PLANNED_GA_COMMAND_CENTS,
    gaGrowthUsd: PLANNED_GA_GROWTH_USD,
    gaGrowthCents: PLANNED_GA_GROWTH_CENTS,
  };
}

export function hashCommercialSpine(): string {
  const commercialPath = abs('lib/ironframeProductKnowledge/commercial.ts');
  const raw = fs.readFileSync(commercialPath, 'utf8');
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function readFingerprint(): Fingerprint | null {
  const raw = readOptional(FINGERPRINT_REL);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Fingerprint;
  } catch {
    return null;
  }
}

export function writeFingerprint(): Fingerprint {
  const fp: Fingerprint = {
    version: 1,
    updatedAt: new Date().toISOString(),
    commercialSha256: hashCommercialSpine(),
    anchors: commercialAnchors(),
  };
  writeRel(FINGERPRINT_REL, `${JSON.stringify(fp, null, 2)}\n`);
  return fp;
}

/** Strip YAML frontmatter if present. */
export function stripFrontmatter(md: string): string {
  if (!md.startsWith('---')) return md;
  const end = md.indexOf('\n---', 3);
  if (end === -1) return md;
  return md.slice(end + 4).replace(/^\r?\n/, '');
}

/** Body after first H1 (keeps rest of sales doc for mirror). */
export function bodyAfterTitle(md: string): string {
  const stripped = stripFrontmatter(md).trimStart();
  const match = stripped.match(/^#\s+[^\n]+\n([\s\S]*)$/);
  return match ? match[1].trimStart() : stripped;
}

export function buildEnablementMirror(pair: MirrorPair, sourceMd: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const body = rewriteSalesLinksForEnablementMirror(bodyAfterTitle(sourceMd));
  const anchors = commercialAnchors();
  const canonicalHref = path.posix
    .relative('docs/sales-enablement', pair.sourceRel)
    .replace(/\\/g, '/');
  return `---
Document Type: Sales Enablement Documentation
Status: ACTIVE
Security Classification: INTERNAL ONLY (Tenant Boundaries Enforced)
Last Updated: ${today}
GeneratedBy: scripts/sync-product-knowledge.ts
---

# ${pair.title}

> Board docs-matrix ingest path (\`sales-enablement\`). Canonical narrative mirrors [\`${pair.sourceRel}\`](${canonicalHref}).  
> Code truth: \`lib/ironframeProductKnowledge/commercial.ts\` (Path B ${formatPathBUsd()} / ${anchors.pathBCents}¢ · planned GA Command ${formatPlannedGaCommandUsd()}/yr).

${body.trim()}
`;
}

/** Sales-folder relative links break when the body is mirrored into sales-enablement/. */
function rewriteSalesLinksForEnablementMirror(body: string): string {
  return body
    .replace(/\]\(\.\/(design-partner-[^)#\s]+)\)/g, '](../sales/$1)')
    .replace(/\]\(\.\/(market-entrance-playbook\.md)\)/g, '](../sales/$1)')
    .replace(/\]\(\.\/sales-enablement\.md\)/g, '](./sales-enablement.md)');
}

function commercialMarkersPresent(text: string): string[] {
  const missing: string[] = [];
  const anchors = commercialAnchors();
  const required = [
    String(anchors.pathBUsd),
    anchors.pathBCents,
    formatPathBUsd(),
    String(anchors.gaCommandUsd),
  ];
  for (const marker of required) {
    if (!text.includes(marker) && !text.includes(marker.replace(',', ''))) {
      // $35,000 vs 35000 — accept either
      if (marker.startsWith('$') && text.includes(marker.replace(/,/g, ''))) continue;
      if (/^\d+$/.test(marker) && text.includes(Number(marker).toLocaleString('en-US'))) continue;
      missing.push(marker);
    }
  }
  return missing;
}

/** Heuristic: docs that mention Path B / Command Tier but wrong dollar amount. */
function findStalePathBLiterals(text: string, fileRel: string): DiffFinding[] {
  const findings: DiffFinding[] = [];
  const anchors = commercialAnchors();
  const expectedUsd = formatPathBUsd(); // $4,999
  const expectedCents = anchors.pathBCents;

  // Common wrong Path B-looking amounts (expand as needed)
  const suspiciousUsd = text.match(/\$\s*4[,\s]?999|\$\s*4999\b/g) ?? [];
  const hasExpected =
    text.includes(expectedUsd) ||
    text.includes(`$${anchors.pathBUsd}`) ||
    text.includes(expectedCents);

  // If file talks about Path B / design partner / Command Tier and has a different 4-digit price nearby
  const mentionsProgram = /path\s*b|design[\s-]?partner|command\s*tier/i.test(text);
  if (!mentionsProgram) return findings;

  // Stale cents that look like old Path B (e.g. 499900 vs something else) — flag if 499900-like wrong
  const centsCandidates = [...text.matchAll(/\b(\d{5,8})\s*¢|\b(\d{5,8})\s*cents\b/gi)];
  for (const m of centsCandidates) {
    const cents = m[1] || m[2];
    if (!cents) continue;
    // Only flag if near Path B language and not the expected value and equals a known commercial slot mismatch
    if (cents === expectedCents) continue;
    if (cents === anchors.gaCommandCents || cents === anchors.gaGrowthCents) continue;
    // Flag legacy mistaken Path B like 4999000 or 49990
    if (/^4999/.test(cents) && cents !== expectedCents) {
      findings.push({
        id: `stale-cents:${fileRel}:${cents}`,
        severity: 'error',
        message: `Possible stale Path B cents "${cents}" — expected ${expectedCents}`,
        path: fileRel,
        fixable: false,
      });
    }
  }

  if (mentionsProgram && suspiciousUsd.length === 0 && !hasExpected) {
    // Mentions program but missing current Path B amount entirely
    findings.push({
      id: `missing-path-b:${fileRel}`,
      severity: 'warn',
      message: `Mentions Path B / design partner / Command Tier but missing ${expectedUsd} / ${expectedCents}`,
      path: fileRel,
      fixable: false,
    });
  }

  void suspiciousUsd;
  return findings;
}

function scanDocTree(relDir: string): DiffFinding[] {
  const dir = abs(relDir);
  if (!fs.existsSync(dir)) return [];
  const out: DiffFinding[] = [];
  const walk = (d: string) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) {
        walk(p);
        continue;
      }
      if (!ent.name.endsWith('.md')) continue;
      const rel = path.relative(rootDir(), p).replace(/\\/g, '/');
      const text = fs.readFileSync(p, 'utf8');
      out.push(...findStalePathBLiterals(text, rel));
    }
  };
  walk(dir);
  return out;
}

export function resolveBlastRadius(opts: {
  spineChanged: boolean;
  mirrorsChanged: boolean;
}): BlastRadiusTarget[] {
  if (!opts.spineChanged && !opts.mirrorsChanged) return [];
  if (opts.spineChanged) return [...PRODUCT_KNOWLEDGE_BLAST_RADIUS];
  // Mirror-only: board + docs + ci
  return PRODUCT_KNOWLEDGE_BLAST_RADIUS.filter((t) =>
    ['ironboard', 'app-docs', 'ci-gate'].includes(t.id),
  );
}

export function runProductKnowledgeSync(opts: { apply: boolean }): SyncReport {
  const findings: DiffFinding[] = [];
  const applied: string[] = [];
  const mirrors: SyncReport['mirrors'] = [];
  const anchors = commercialAnchors();
  const currentHash = hashCommercialSpine();
  const prev = readFingerprint();
  const spineChanged = !prev || prev.commercialSha256 !== currentHash;

  if (spineChanged) {
    findings.push({
      id: 'spine-changed',
      severity: 'info',
      message: prev
        ? `commercial.ts changed since last fingerprint (${prev.updatedAt})`
        : 'No fingerprint yet — run with --apply to baseline',
      path: 'lib/ironframeProductKnowledge/commercial.ts',
      fixable: true,
    });
  }

  let mirrorsChanged = false;

  for (const pair of PRODUCT_KNOWLEDGE_MIRRORS) {
    const source = readOptional(pair.sourceRel);
    const target = readOptional(pair.targetRel);

    if (!source) {
      mirrors.push({
        id: pair.id,
        sourceRel: pair.sourceRel,
        targetRel: pair.targetRel,
        status: 'missing_source',
      });
      findings.push({
        id: `mirror-missing-source:${pair.id}`,
        severity: 'error',
        message: `Missing source ${pair.sourceRel}`,
        path: pair.sourceRel,
        fixable: false,
      });
      continue;
    }

    const desired = buildEnablementMirror(pair, source);
    if (!target) {
      mirrorsChanged = true;
      mirrors.push({
        id: pair.id,
        sourceRel: pair.sourceRel,
        targetRel: pair.targetRel,
        status: opts.apply ? 'updated' : 'missing_target',
      });
      findings.push({
        id: `mirror-missing-target:${pair.id}`,
        severity: 'error',
        message: `Missing board mirror ${pair.targetRel}`,
        path: pair.targetRel,
        fixable: true,
      });
      if (opts.apply) {
        writeRel(pair.targetRel, desired);
        applied.push(pair.targetRel);
      }
      continue;
    }

    // Drift = target missing commercial anchors from spine OR differs from regenerated body markers
    const missing = commercialMarkersPresent(target);
    const desiredBody = bodyAfterTitle(desired);
    const targetBody = bodyAfterTitle(target);
    // Compare normalized bodies loosely: if source narrative changed, bodies diverge
    const bodyDrift = normalizeForDiff(desiredBody) !== normalizeForDiff(targetBody);
    const statusDrift = !/Status:\s*ACTIVE/i.test(target) || /STAGED\s*\/\s*DRAFT/i.test(target);

    if (missing.length || bodyDrift || statusDrift) {
      mirrorsChanged = true;
      mirrors.push({
        id: pair.id,
        sourceRel: pair.sourceRel,
        targetRel: pair.targetRel,
        status: opts.apply ? 'updated' : 'drift',
      });
      findings.push({
        id: `mirror-drift:${pair.id}`,
        severity: 'error',
        message: [
          `Mirror drift for ${pair.id}`,
          missing.length ? `missing anchors: ${missing.join(', ')}` : null,
          bodyDrift ? 'source narrative differs from enablement body' : null,
          statusDrift ? 'target not ACTIVE / still STAGED' : null,
        ]
          .filter(Boolean)
          .join(' — '),
        path: pair.targetRel,
        fixable: true,
      });
      if (opts.apply) {
        writeRel(pair.targetRel, desired);
        applied.push(pair.targetRel);
      }
    } else {
      mirrors.push({
        id: pair.id,
        sourceRel: pair.sourceRel,
        targetRel: pair.targetRel,
        status: 'in_sync',
      });
    }
  }

  for (const rel of ENABLEMENT_ONLY_DOCS) {
    const text = readOptional(rel);
    if (!text) {
      findings.push({
        id: `enablement-missing:${rel}`,
        severity: 'error',
        message: `Missing enablement doc ${rel}`,
        path: rel,
        fixable: false,
      });
      continue;
    }
    if (!/Status:\s*ACTIVE/i.test(text) || /STAGED\s*\/\s*DRAFT/i.test(text)) {
      findings.push({
        id: `enablement-staged:${rel}`,
        severity: 'error',
        message: `${rel} must be Status: ACTIVE (not STAGED scaffold)`,
        path: rel,
        fixable: false,
      });
    }
    const missing = commercialMarkersPresent(text);
    // message-constitution may not list GA growth — only require Path B
    if (rel.includes('message-constitution')) {
      if (!text.includes(String(DESIGN_PARTNER_PATH_B_USD)) && !text.includes(formatPathBUsd())) {
        findings.push({
          id: `enablement-anchors:${rel}`,
          severity: 'warn',
          message: `${rel} should mention Path B ${formatPathBUsd()}`,
          path: rel,
          fixable: false,
        });
      }
    } else if (missing.length) {
      findings.push({
        id: `enablement-anchors:${rel}`,
        severity: 'error',
        message: `${rel} missing commercial anchors: ${missing.join(', ')}`,
        path: rel,
        fixable: false,
      });
    }
    findings.push(...findStalePathBLiterals(text, rel));
  }

  findings.push(...scanDocTree('docs/sales'));
  findings.push(...scanDocTree('docs/sales-enablement'));

  if (opts.apply) {
    writeFingerprint();
    applied.push(FINGERPRINT_REL);
    // Recompute spineChanged after baseline for report clarity
  }

  const errors = findings.filter((f) => f.severity === 'error');
  const ok = errors.length === 0 || (opts.apply && errors.every((e) => e.fixable));
  // After apply, re-evaluate: if we applied all fixable, ok if no unfixable errors remain
  const unfixableErrors = findings.filter((f) => f.severity === 'error' && !f.fixable);
  const reportOk = opts.apply ? unfixableErrors.length === 0 : errors.length === 0;

  const blastRadius = resolveBlastRadius({
    spineChanged: spineChanged || (opts.apply && applied.includes(FINGERPRINT_REL)),
    mirrorsChanged: mirrorsChanged || applied.some((p) => p.includes('sales-enablement')),
  });

  const report: SyncReport = {
    ok: reportOk,
    spineChanged,
    findings,
    mirrors,
    blastRadius,
    commercialAnchors: anchors,
    applied,
  };

  // Persist / clear operator-local latch for Ops Hub floating notice
  try {
    if (!reportOk) {
      writeDriftNotice({
        source: opts.apply ? 'cli' : 'knowledge-check',
        summary: findings
          .filter((f) => f.severity === 'error')
          .map((f) => f.message)
          .slice(0, 3)
          .join(' · '),
      });
    } else {
      clearDriftNotice();
    }
  } catch {
    // notice latch is best-effort
  }

  return report;
}

function normalizeForDiff(s: string): string {
  return s
    .replace(/\r\n/g, '\n')
    .replace(/GeneratedBy:[^\n]+\n/g, '')
    .replace(/Last Updated:[^\n]+\n/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function formatSyncReport(report: SyncReport): string {
  const lines: string[] = [];
  lines.push('═══ PRODUCT KNOWLEDGE SYNC ═══');
  lines.push(
    `Spine: Path B ${formatPathBUsd()} (${report.commercialAnchors.pathBCents}¢) · GA Command ${formatPlannedGaCommandUsd()}/yr`,
  );
  lines.push(`Status: ${report.ok ? 'OK' : 'DRIFT'} · spineChanged=${report.spineChanged}`);
  lines.push('');
  lines.push('Mirrors:');
  for (const m of report.mirrors) {
    lines.push(`  [${m.status}] ${m.id}: ${m.sourceRel} → ${m.targetRel}`);
  }
  if (report.findings.length) {
    lines.push('');
    lines.push('Findings:');
    for (const f of report.findings) {
      lines.push(`  ${f.severity.toUpperCase()}${f.fixable ? ' (fixable)' : ''}: ${f.message}`);
      if (f.path) lines.push(`    @ ${f.path}`);
    }
  }
  if (report.applied.length) {
    lines.push('');
    lines.push('Applied:');
    for (const a of report.applied) lines.push(`  ✓ ${a}`);
  }
  if (report.blastRadius.length) {
    lines.push('');
    lines.push('Blast radius (update / restart):');
    for (const t of report.blastRadius) {
      lines.push(`  • [${t.kind}] ${t.label} — ${t.reason}`);
      for (const p of t.paths) lines.push(`      - ${p}`);
    }
  } else {
    lines.push('');
    lines.push('Blast radius: none (no spine/mirror changes detected).');
  }
  lines.push('══════════════════════════════');
  return lines.join('\n');
}
