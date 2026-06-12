import type { DocsMatrixCategory } from '../../types/boardKnowledge.js';

export type DocsQueryIntent = {
  matchesCorporateDocs: boolean;
  docCategory: DocsMatrixCategory | null;
  titleHint: string | null;
};

const CATEGORY_KEYWORDS: Array<{ category: DocsMatrixCategory; patterns: RegExp[] }> = [
  {
    category: 'stakeholder-deck',
    patterns: [/product vision/i, /product roadmap/i, /business plan/i, /stakeholder/i, /technical requirements/i],
  },
  {
    category: 'sales-enablement',
    patterns: [/sales enablement/i, /pricing and packaging/i, /competitive analysis/i, /sales playbook/i],
  },
  {
    category: 'marketing-strategy',
    patterns: [/marketing plan/i, /marketing strategy/i, /brand style/i, /content calendar/i, /social media/i],
  },
  {
    category: 'external-relations',
    patterns: [/elevator pitch/i, /product overview/i, /marketing one-pager/i, /external relations/i],
  },
  {
    category: 'end-user-manuals',
    patterns: [/user guide/i, /onboarding/i, /release notes/i, /end user/i, /\bfaq\b/i],
  },
  {
    category: 'operations-support',
    patterns: [/support guide/i, /knowledge base/i, /error messages/i, /grc troubleshooting/i, /operations support/i],
  },
  {
    category: 'training-academy',
    patterns: [/training academy/i, /training guide/i, /testing protocol/i, /feature glossary/i, /ironboard writer/i],
  },
];

const CORPORATE_DOCS_PATTERNS = [
  /product vision/i,
  /sales enablement/i,
  /marketing strategy/i,
  /corporate documentation/i,
  /documentation matrix/i,
  /stakeholder deck/i,
  /business plan/i,
  /competitive analysis/i,
  /pricing and packaging/i,
  /elevator pitch/i,
  /user guide/i,
  /support guide/i,
  /training academy/i,
  /grc troubleshooting/i,
];

export function resolveDocsQueryIntent(query: string): DocsQueryIntent {
  const normalized = query.trim();
  if (!normalized) {
    return { matchesCorporateDocs: false, docCategory: null, titleHint: null };
  }

  const matchesCorporateDocs = CORPORATE_DOCS_PATTERNS.some(pattern => pattern.test(normalized));
  let docCategory: DocsMatrixCategory | null = null;

  for (const entry of CATEGORY_KEYWORDS) {
    if (entry.patterns.some(pattern => pattern.test(normalized))) {
      docCategory = entry.category;
      break;
    }
  }

  const titleHint =
    normalized.match(/(?:about|on|for|regarding)\s+(.{4,80})/i)?.[1]?.trim() ??
    (docCategory ? docCategory.replace(/-/g, ' ') : null);

  return {
    matchesCorporateDocs: matchesCorporateDocs || docCategory !== null,
    docCategory,
    titleHint,
  };
}

export function requiresCorporateDocsPrefetch(query: string): boolean {
  return resolveDocsQueryIntent(query).matchesCorporateDocs;
}
