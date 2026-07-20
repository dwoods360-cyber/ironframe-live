import { describe, expect, it } from 'vitest';

import {
  PRODUCT_KNOWLEDGE_BLAST_RADIUS,
  PRODUCT_KNOWLEDGE_MIRRORS,
  buildEnablementMirror,
  formatSyncReport,
  runProductKnowledgeSync,
} from '@/lib/ironframeProductKnowledge';
import fs from 'node:fs';
import path from 'node:path';

describe('product knowledge sync + blast radius', () => {
  it('registers mirror pairs and blast-radius targets', () => {
    expect(PRODUCT_KNOWLEDGE_MIRRORS.length).toBeGreaterThanOrEqual(2);
    expect(PRODUCT_KNOWLEDGE_BLAST_RADIUS.map((t) => t.id)).toEqual(
      expect.arrayContaining(['ironboard', 'salesteam', 'ironleads', 'ci-gate']),
    );
    const ci = PRODUCT_KNOWLEDGE_BLAST_RADIUS.find((t) => t.id === 'ci-gate');
    expect(ci?.reason).toMatch(/pre-commit/i);
    expect(ci?.paths).toEqual(expect.arrayContaining(['.github/workflows/ci.yml']));
  });

  it('builds enablement mirrors with ACTIVE status and Path B anchors', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'docs/sales/pricing-and-packaging.md'),
      'utf8',
    );
    const pair = PRODUCT_KNOWLEDGE_MIRRORS.find((m) => m.id === 'pricing-and-packaging');
    expect(pair).toBeTruthy();
    const mirror = buildEnablementMirror(pair!, source);
    expect(mirror).toMatch(/Status:\s*ACTIVE/);
    expect(mirror).toContain('GeneratedBy: scripts/sync-product-knowledge.ts');
    expect(mirror).toContain('$4,999');
    expect(mirror).toContain('499900');
    expect(mirror).toContain('](../sales/pricing-and-packaging.md)');
    expect(mirror).toContain('](../sales/design-partner-order-form.md)');
    expect(mirror).not.toContain('](../../sales/');
  });

  it('check mode returns a structured report', () => {
    const report = runProductKnowledgeSync({ apply: false });
    expect(report.commercialAnchors.pathBCents).toBe('499900');
    expect(report.mirrors.length).toBe(PRODUCT_KNOWLEDGE_MIRRORS.length);
    const text = formatSyncReport(report);
    expect(text).toContain('PRODUCT KNOWLEDGE SYNC');
    expect(text).toContain('Blast radius');
  });
});
