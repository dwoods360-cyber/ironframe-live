import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseIronscribeMarkdownDocument } from '../../Ironboard/src/services/ironscribe/markdownOutlineParser.js';
import {
  DOCS_MATRIX_CATEGORIES,
} from '../../Ironboard/src/types/boardKnowledge.js';
import {
  parseScannedMatrixDocuments,
  scanDocsMatrixFromDisk,
} from '../../Ironboard/src/services/crm/docsMatrixIngress.js';
import {
  requiresCorporateDocsPrefetch,
  resolveDocsQueryIntent,
} from '../../Ironboard/src/services/ingress/docsQueryIntent.js';
import { buildBoardKnowledgeEnrichment } from '../../Ironboard/src/services/ingress/docsBoardPrefetch.js';

const SAMPLE_DOC = `---
Document Type: Stakeholder Deck Documentation
Status: STAGED / DRAFT
Security Classification: INTERNAL ONLY (Tenant Boundaries Enforced)
Last Updated: 2026-06-11
---

# Product Vision

> **STAGED DRAFT** — Scaffold entry.

## Purpose

Purpose, strategic goals, KPIs, and non-goals for Ironframe GRC.

## Outline (to complete)

1. Executive summary
2. Primary audience and prerequisites
3. Step-by-step procedures or narrative sections
4. Verification checklist
5. Escalation and related documents
`;

describe('Ironscribe markdownOutlineParser (Agent 05)', () => {
  it('strips YAML metadata and structures outline sections', () => {
    const parsed = parseIronscribeMarkdownDocument({
      relativePath: 'stakeholder-deck/product-vision.md',
      docCategory: 'stakeholder-deck',
      rawMarkdown: SAMPLE_DOC,
      parsedAt: '2026-06-11T12:00:00.000Z',
    });

    expect(parsed.title).toBe('Product Vision');
    expect(parsed.docCategory).toBe('stakeholder-deck');
    expect(parsed.metadata['Status']).toBe('STAGED / DRAFT');
    expect(parsed.parsedBy).toBe('Ironscribe-Agent-05');
    expect(parsed.sections.some(section => section.heading === 'Purpose')).toBe(true);

    const outlineSection = parsed.sections.find(section => section.heading === 'Outline (to complete)');
    expect(outlineSection?.outlineItems).toHaveLength(5);
    expect(outlineSection?.outlineItems[0]?.text).toBe('Executive summary');
    expect(parsed.bodyMarkdown).not.toContain('Document Type:');
  });
});

describe('docs matrix scanner', () => {
  it('discovers staged markdown across all seven matrix categories', () => {
    const docsRoot = path.join(process.cwd(), 'docs');
    const scanned = scanDocsMatrixFromDisk(docsRoot);
    expect(scanned.length).toBeGreaterThanOrEqual(31);

    const categories = new Set(scanned.map(doc => doc.docCategory));
    for (const category of DOCS_MATRIX_CATEGORIES) {
      expect(categories.has(category)).toBe(true);
    }

    expect(scanned.some(doc => doc.relativePath === 'stakeholder-deck/product-vision.md')).toBe(true);
    expect(scanned.some(doc => doc.relativePath === 'sales-enablement/sales-enablement.md')).toBe(true);
  });

  it('does not include root governance files in matrix scan', () => {
    const docsRoot = path.join(process.cwd(), 'docs');
    const scanned = scanDocsMatrixFromDisk(docsRoot);
    expect(scanned.some(doc => doc.relativePath === 'TAS.md')).toBe(false);
    expect(scanned.some(doc => doc.relativePath === 'testing.md')).toBe(false);
  });

  it('parses on-disk product vision scaffold', () => {
    const docsRoot = path.join(process.cwd(), 'docs');
    const filePath = path.join(docsRoot, 'stakeholder-deck/product-vision.md');
    const rawMarkdown = fs.readFileSync(filePath, 'utf-8');
    const [parsed] = parseScannedMatrixDocuments([
      {
        relativePath: 'stakeholder-deck/product-vision.md',
        docCategory: 'stakeholder-deck',
        rawMarkdown,
      },
    ]);

    expect(parsed.title).toBe('Product Vision');
    expect(parsed.documentId).toBe('stakeholder-deck/product-vision.md');
  });
});

describe('docs query intent', () => {
  it('matches Product Vision and Sales Enablement queries', () => {
    expect(requiresCorporateDocsPrefetch('What is our Product Vision?')).toBe(true);
    expect(requiresCorporateDocsPrefetch('Summarize Sales Enablement materials')).toBe(true);

    const visionIntent = resolveDocsQueryIntent('Tell me about Product Vision');
    expect(visionIntent.docCategory).toBe('stakeholder-deck');

    const salesIntent = resolveDocsQueryIntent('Sales Enablement playbook overview');
    expect(salesIntent.docCategory).toBe('sales-enablement');
  });

  it('ignores unrelated operational queries', () => {
    expect(requiresCorporateDocsPrefetch('What is the weather in London?')).toBe(false);
  });
});

describe('board knowledge enrichment', () => {
  it('embeds classification and doc_category in enrichment block', () => {
    const parsed = parseIronscribeMarkdownDocument({
      relativePath: 'sales-enablement/sales-enablement.md',
      docCategory: 'sales-enablement',
      rawMarkdown: SAMPLE_DOC.replace('Product Vision', 'Sales Enablement'),
    });

    const enrichment = buildBoardKnowledgeEnrichment([parsed]);
    expect(enrichment).toContain('CORPORATE DOCUMENTATION MATRIX');
    expect(enrichment).toContain('board_knowledge');
    expect(enrichment).toContain('sales-enablement');
    expect(enrichment).toContain('Sales Enablement');
  });
});
