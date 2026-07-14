import { parseTargetCountriesInput } from '../lib/flywheelTargetCountries.js';
import { payloadSignalsVideoIntelligence } from './boardResponseLibrary.js';

const MARKET_COUNTRY_ALIASES: ReadonlyArray<{ token: string; label: string }> = [
  { token: 'germany', label: 'Germany' },
  { token: 'australia', label: 'Australia' },
  { token: 'ireland', label: 'Ireland' },
  { token: 'canada', label: 'Canada' },
  { token: 'singapore', label: 'Singapore' },
  { token: 'london', label: 'London' },
  { token: 'united kingdom', label: 'United Kingdom' },
  { token: 'uk', label: 'United Kingdom' },
];

const REGIONAL_ICP_SIGNAL =
  /\b(icp|fit our|qualified|prospects?|companies|leads?|pipeline|accounts?|targets?)\b/i;

/** Operator requests for GTM / market intelligence (triggers live discovery prefetch). */
const GTM_MARKET_SIGNAL =
  /\b(market research|market scan|market intelligence|go-to-market|go to market|gtm\b|target market|potential customers?|addressable market|tam\b|competitive landscape|industry research|sector analysis|identify companies|find companies|company discovery|who should we sell to|ideal customer profile)\b/i;

/** GRC / regulatory environment intelligence (live web grounding — no fabricated rules). */
const GRC_ENVIRONMENT_SIGNAL =
  /\b(grc\b|governance[\s-]risk[\s-]compliance|regulatory environment|regulatory landscape|compliance environment|compliance landscape|regulatory catalyst|regulatory pressure|enforcement trend|ffiec|nerc\b|cip\b|hipaa|hitrust|bsa\b|glba|sector oversight|framework pressure)\b/i;

/** Terms that indicate the user wants internal flywheel / CRM data. */
const WORKSPACE_QUERY_TERMS = [
  'crm',
  'customer relationship',
  'contact management',
  'deal pipeline',
  'sales pipeline',
  'prospect',
  'prospects',
  'flywheel',
  'outreach',
  'pipeline',
  'icp score',
  'harvest',
  'outreach history',
  'flywheel log',
  'active lead',
  'active leads',
  'our clients',
  'querylocalworkspace',
  'managecrmpipeline',
] as const;

/** Board questions about whether CRM / sales tooling exists (requires manageCrmPipeline discovery). */
export function requiresCrmDiscovery(query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.includes('crm') || q.includes('managecrmpipeline')) return true;
  if (q.includes('contact database') || q.includes('deal pipeline')) return true;
  if (
    q.includes('sales') &&
    (q.includes('ironboard') || q.includes('methodolog') || q.includes('playbook'))
  ) {
    return true;
  }
  if (q.includes('playbook') || q.includes('knowledge base')) return true;
  if (
    (q.includes('do you have') ||
      q.includes('does ironboard') ||
      q.includes('does ironframe') ||
      q.includes('what can you') ||
      q.includes('capabilit')) &&
    (q.includes('crm') || q.includes('pipeline') || q.includes('contact'))
  ) {
    return true;
  }
  return false;
}

export function requiresWorkspaceTools(query: string): boolean {
  return requiresCrmDiscovery(query) || shouldPrefetchProspects(query);
}

/** Signals that the user needs live or global (non-CRM) information. */
const EXTERNAL_INFO_TERMS = [
  'time',
  'timezone',
  'weather',
  'news',
  'latest',
  'current',
  'today',
  'regulation',
  'compliance',
  'fca',
  'market intel',
  'broken',
  'who is',
  'what is',
  'where is',
  'when is',
  'how much',
  'world',
  'global',
  'international',
  'around the world',
] as const;

export function needsExternalInfo(query: string): boolean {
  const q = query.toLowerCase();
  const stemsOnly = new Set([
    'what is',
    "what's",
    'who is',
    'where is',
    'when is',
    'how much',
  ]);
  // Internal CRM/pipeline asks often include "what is …" — that must not force Google Search
  // prefetch (previously blocked the board on Streaming… for minutes).
  if (requiresCrmDiscovery(query) || shouldPrefetchProspects(query)) {
    return EXTERNAL_INFO_TERMS.filter((term) => !stemsOnly.has(term)).some((term) =>
      q.includes(term),
    );
  }
  return EXTERNAL_INFO_TERMS.some((term) => q.includes(term));
}

export function matchCountriesInQuery(query: string): string[] {
  const q = query.toLowerCase();
  const found: string[] = [];
  for (const { token, label } of MARKET_COUNTRY_ALIASES) {
    if (token === 'uk') {
      if (/\buk\b/.test(q)) found.push(label);
      continue;
    }
    if (q.includes(token)) found.push(label);
  }
  return [...new Set(found)];
}

function normalizeMarketLabel(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const token = trimmed.toLowerCase();
  for (const { token: aliasToken, label } of MARKET_COUNTRY_ALIASES) {
    if (aliasToken === token || label.toLowerCase() === token) return label;
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

export function parseActiveTargetCountries(activeHub: string): string[] {
  return parseTargetCountriesInput(String(activeHub ?? '').replace(/,/g, '|'))
    .map(normalizeMarketLabel)
    .filter(Boolean);
}

export function inferRegionsFromQuery(query: string, activeHub: string): string[] {
  const fromQuery = matchCountriesInQuery(query);
  if (fromQuery.length) return fromQuery;
  const fromHub = parseActiveTargetCountries(activeHub);
  if (fromHub.length) return fromHub;
  const legacy = inferRegionFromQuery(query, activeHub);
  return legacy ? [legacy] : [];
}

export function isGtmMarketQuery(query: string): boolean {
  return GTM_MARKET_SIGNAL.test(query.trim());
}

/** Competitive / investor positioning questions — answer with canonical honesty, not strategy-vault hype. */
export function isCompetitivePositioningQuery(query: string): boolean {
  const q = query.trim().toLowerCase();
  if (isMarketResearchCapabilityQuery(q)) return false;
  return (
    /\b(market edge|competitive position|competitive landscape|ahead of the market|uncopyable|order-of-magnitude)\b/.test(
      q,
    ) ||
    /\b(lost our edge|never lost(?: its| our)? market edge|true market edge)\b/.test(q) ||
    /\b(demonstrably ahead|massive,? uncopyable)\b/.test(q) ||
    /\b(are we|is ironframe) ahead\b/.test(q) ||
    /\bvs\.?\s*(vanta|drata|optro|onetrust|servicenow|auditboard)\b/.test(q) ||
    /\b(board|ironframe).{0,40}\b(in line|aligned)\b/.test(q)
  );
}

/** Meta questions ("can you perform real market research?") — answer with execution proof, not LLM disclaimers. */
export function isMarketResearchCapabilityQuery(query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!GTM_MARKET_SIGNAL.test(q)) return false;
  if (/\b(real market research|comprehensive sense)\b/.test(q)) return true;
  return /\b(are you|can you|could you|unable|not able|not capable|capable of|ability to|do you)\b/.test(
    q,
  );
}

export function isGrcEnvironmentQuery(query: string): boolean {
  return GRC_ENVIRONMENT_SIGNAL.test(query.trim());
}

/**
 * GRC environment Google-Search prefetch is expensive (one Gemini web call per region).
 * Only run it for explicit GRC/regulatory questions — never piggy-back on every
 * pipeline/prospect board query (that made CRM "Query" hang for minutes with no tokens).
 */
export function shouldPrefetchGrcEnvironment(query: string): boolean {
  return isGrcEnvironmentQuery(query);
}

export function shouldPrefetchProspects(query: string): boolean {
  const q = query.toLowerCase();
  if (GTM_MARKET_SIGNAL.test(q)) return true;
  if (WORKSPACE_QUERY_TERMS.some(term => q.includes(term))) return true;
  if (matchCountriesInQuery(query).length > 0 && REGIONAL_ICP_SIGNAL.test(query)) return true;
  if (/\b(bhc|bank holding|utility|utilities|nerc|hospital|health system)\b/.test(q)) {
    return true;
  }
  if (/\b(our|active|local|my)\b[\s\S]{0,40}\b(london|singapore)\b/.test(q)) return true;
  if (/\b(london|singapore)\b[\s\S]{0,40}\b(prospect|prospects|pipeline|lead|leads|flywheel|outreach|harvest|icp)\b/.test(q)) {
    return true;
  }
  return false;
}
/** Prefetch live web grounding unless the query is strictly internal CRM data or a video link. */
export function shouldPrefetchWeb(query: string): boolean {
  if (payloadSignalsVideoIntelligence(query)) return false;
  if (shouldPrefetchGrcEnvironment(query)) return false;
  return !isWorkspaceOnlyQuery(query);
}

export function isWorkspaceOnlyQuery(query: string): boolean {
  return shouldPrefetchProspects(query) && !needsExternalInfo(query);
}

export function inferRegionFromQuery(query: string, activeHub: string): string | undefined {
  const q = query.toLowerCase();
  if (q.includes('singapore')) return 'Singapore';
  if (q.includes('london')) return 'London';
  const hubKey = String(activeHub ?? '').trim().toUpperCase();
  if (hubKey === 'LONDON') return 'London';
  if (hubKey === 'SINGAPORE') return 'Singapore';
  return undefined;
}
