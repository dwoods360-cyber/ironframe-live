import type { BeachheadSector } from '../types/leadGenKnowledge.js';
import { LEAD_GEN_KNOWLEDGE_CATALOG, LEAD_GEN_KNOWLEDGE_CORPUS } from './leadGenCorpus.js';
import type {
  LeadGenCategory,
  LeadGenEntryKind,
  LeadGenKnowledgeEntry,
  LeadGenKnowledgeManifest,
  LeadGenKnowledgeSummary,
  LeadGenTriggerSignal,
} from '../types/leadGenKnowledge.js';
import { LEAD_GEN_CATEGORIES, isLeadGenCategory } from '../types/leadGenKnowledge.js';

export { LEAD_GEN_KNOWLEDGE_CORPUS, LEAD_GEN_KNOWLEDGE_CATALOG } from './leadGenCorpus.js';

export const IRONLEADS_KNOWLEDGE_MANIFEST: LeadGenKnowledgeManifest = {
  manifestVersion: '1.0.0',
  corpusId: 'ironleads-lead-gen-knowledge-v1',
  title: 'Ironleads Lead Generation Knowledge Base',
  description:
    'Authoritative corpus of proven B2B lead-generation books, strategies, and OSINT frameworks aligned to Ironframe beachhead GTM and IronBoard CRM qualification scoring.',
  generatedAt: '2026-07-07T02:00:00.000Z',
  entryCount: LEAD_GEN_KNOWLEDGE_CATALOG.length,
  categories: LEAD_GEN_CATEGORIES,
  beachheadAlignment: [
    'REGIONAL_BHC',
    'UTILITY_NERC',
    'MSSP_ENCLAVE',
    'HEALTH_HIPAA',
  ],
};

export function getLeadGenEntry(id: string): LeadGenKnowledgeEntry {
  const entry = LEAD_GEN_KNOWLEDGE_CORPUS[id];
  if (!entry) throw new Error(`Unknown lead-gen knowledge id "${id}"`);
  return entry;
}

export function listLeadGenSummaries(): LeadGenKnowledgeSummary[] {
  return LEAD_GEN_KNOWLEDGE_CATALOG.map(entry => ({
    id: entry.id,
    kind: entry.kind,
    title: entry.title,
    authors: entry.authors,
    category: entry.category,
    coreConcept: entry.coreConcept,
    beachheadSectors: entry.beachheadSectors,
  }));
}

export function listLeadGenByCategory(category: LeadGenCategory): LeadGenKnowledgeEntry[] {
  return LEAD_GEN_KNOWLEDGE_CATALOG.filter(entry => entry.category === category);
}

export function listLeadGenByKind(kind: LeadGenEntryKind): LeadGenKnowledgeEntry[] {
  return LEAD_GEN_KNOWLEDGE_CATALOG.filter(entry => entry.kind === kind);
}

export function listLeadGenForBeachhead(sector: BeachheadSector): LeadGenKnowledgeEntry[] {
  return LEAD_GEN_KNOWLEDGE_CATALOG.filter(
    entry => entry.beachheadSectors === 'ALL' || entry.beachheadSectors.includes(sector),
  );
}

export function listLeadGenByTrigger(trigger: LeadGenTriggerSignal): LeadGenKnowledgeEntry[] {
  return LEAD_GEN_KNOWLEDGE_CATALOG.filter(entry => entry.triggerSignals?.includes(trigger));
}

export function searchLeadGenKnowledge(query: string): LeadGenKnowledgeEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return LEAD_GEN_KNOWLEDGE_CATALOG;
  return LEAD_GEN_KNOWLEDGE_CATALOG.filter(entry => {
    const haystack = [
      entry.id,
      entry.title,
      entry.coreConcept,
      entry.ironframeApplication,
      ...entry.authors,
      ...entry.keyTactics,
      ...(entry.discoveryQuestions ?? []),
      ...(entry.osintVectors ?? []),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function filterLeadGenKnowledge(filters: {
  category?: string;
  kind?: string;
  beachheadSector?: string;
  trigger?: string;
  query?: string;
}): LeadGenKnowledgeEntry[] {
  let results = LEAD_GEN_KNOWLEDGE_CATALOG;

  if (filters.category && isLeadGenCategory(filters.category)) {
    results = results.filter(entry => entry.category === filters.category);
  }
  if (filters.kind === 'book' || filters.kind === 'strategy' || filters.kind === 'framework') {
    results = results.filter(entry => entry.kind === filters.kind);
  }
  if (
    filters.beachheadSector &&
    ['REGIONAL_BHC', 'UTILITY_NERC', 'MSSP_ENCLAVE', 'HEALTH_HIPAA', 'UNCLASSIFIED'].includes(
      filters.beachheadSector,
    )
  ) {
    const sector = filters.beachheadSector as BeachheadSector;
    results = results.filter(
      entry => entry.beachheadSectors === 'ALL' || entry.beachheadSectors.includes(sector),
    );
  }
  if (filters.trigger) {
    const t = filters.trigger.toUpperCase();
    results = results.filter(entry =>
      entry.triggerSignals?.some(signal => signal === t),
    );
  }
  if (filters.query?.trim()) {
    const ids = new Set(searchLeadGenKnowledge(filters.query).map(entry => entry.id));
    results = results.filter(entry => ids.has(entry.id));
  }

  return results;
}
