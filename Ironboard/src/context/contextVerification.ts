import { CORE_COMPANY_PRODUCTS, CompanyProductProfile } from './productRegistry.js';

interface FrameworkEntry {
  title: string;
  author: string;
  coreConcepts: string[];
}

interface RosterEntry {
  id: string;
  expertise: string[];
}

export class ContextVerificationError extends Error {
  readonly code = 'CONTEXT_REJECTED';

  constructor(message: string) {
    super(message);
    this.name = 'ContextVerificationError';
  }
}

const CORPORATE_INTENT_KEYWORDS = [
  'financial', 'budget', 'cents', 'risk', 'compliance', 'regulatory',
  'market', 'category', 'position', 'technical', 'code', 'architecture',
  'strategy', 'board', 'grc', 'executive', 'framework', 'baseline', 'ale',
  'tenant', 'product', 'ironframe', 'ironboard', 'docs', 'accessibility',
  'mitigation', 'sovereign', 'allocation',
] as const;

export interface StaticContextMatch {
  matchReason: string;
  matchedProduct?: CompanyProductProfile;
  matchedFrameworkTitle?: string;
}

/** Deterministic allowlist — query must map to registry, vault, or validated intent. */
export function verifyStaticContext(
  query: string,
  vault: FrameworkEntry[],
  roster: RosterEntry[],
): StaticContextMatch {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    throw new ContextVerificationError(
      'Empty query intercepted — no validated corporate profile to evaluate.',
    );
  }

  for (const product of CORE_COMPANY_PRODUCTS) {
    const keys = [
      product.productKey,
      product.name.toLowerCase(),
      ...product.searchAliases.map(a => a.toLowerCase()),
    ];
    if (keys.some(token => normalized.includes(token))) {
      return { matchReason: `product-registry:${product.productKey}`, matchedProduct: product };
    }
  }

  for (const framework of vault) {
    if (normalized.includes(framework.title.toLowerCase())) {
      return { matchReason: `framework-vault:${framework.title}`, matchedFrameworkTitle: framework.title };
    }
    if (normalized.includes(framework.author.toLowerCase())) {
      return { matchReason: `framework-vault:${framework.title}`, matchedFrameworkTitle: framework.title };
    }
    for (const concept of framework.coreConcepts) {
      if (normalized.includes(concept.toLowerCase())) {
        return { matchReason: `framework-concept:${concept}`, matchedFrameworkTitle: framework.title };
      }
    }
  }

  for (const agent of roster) {
    for (const skill of agent.expertise) {
      if (normalized.includes(skill.toLowerCase())) {
        return { matchReason: `roster-expertise:${agent.id}` };
      }
    }
  }

  if (CORPORATE_INTENT_KEYWORDS.some(keyword => normalized.includes(keyword))) {
    return { matchReason: 'corporate-intent-keyword' };
  }

  throw new ContextVerificationError(
    'Query intercepted — text does not map to a validated product registry entry or business framework vault record.',
  );
}
