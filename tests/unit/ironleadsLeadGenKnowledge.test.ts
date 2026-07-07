import { describe, expect, it } from 'vitest';

import {
  filterLeadGenKnowledge,
  getLeadGenEntry,
  IRONLEADS_KNOWLEDGE_MANIFEST,
  LEAD_GEN_KNOWLEDGE_CATALOG,
  listLeadGenByTrigger,
  listLeadGenForBeachhead,
  searchLeadGenKnowledge,
} from '@/Ironleads/src/knowledge/index';
import { executeLeadGenKnowledgeTool } from '@/Ironleads/src/tools/leadGenKnowledgeTools';

describe('ironleadsLeadGenKnowledge', () => {
  it('ships a non-empty corpus with manifest alignment', () => {
    expect(LEAD_GEN_KNOWLEDGE_CATALOG.length).toBeGreaterThanOrEqual(25);
    expect(IRONLEADS_KNOWLEDGE_MANIFEST.entryCount).toBe(LEAD_GEN_KNOWLEDGE_CATALOG.length);
    expect(IRONLEADS_KNOWLEDGE_MANIFEST.corpusId).toBe('ironleads-lead-gen-knowledge-v1');
  });

  it('includes hallmark lead-gen books', () => {
    const titles = LEAD_GEN_KNOWLEDGE_CATALOG.map(entry => entry.title);
    expect(titles).toContain('Predictable Revenue');
    expect(titles).toContain('Fanatical Prospecting');
    expect(titles).toContain('Crossing the Chasm');
    expect(titles).toContain('The Mom Test');
    expect(titles).toContain('ABM Is B2B');
    expect(titles).toContain('Building a StoryBrand');
    expect(titles).toContain('Marketing Made Simple');
    expect(titles).toContain('Made to Stick');
  });

  it('includes Ironleads OSINT strategies', () => {
    const ids = LEAD_GEN_KNOWLEDGE_CATALOG.map(entry => entry.id);
    expect(ids).toContain('trigger_event_selling');
    expect(ids).toContain('regulatory_osint_harvesting');
    expect(ids).toContain('board_slide_discovery_opener');
  });

  it('filters by beachhead and trigger', () => {
    const utility = listLeadGenForBeachhead('UTILITY_NERC');
    expect(utility.some(entry => entry.id === 'regulatory_osint_harvesting')).toBe(true);

    const ciso = listLeadGenByTrigger('NEW_CISO');
    expect(ciso.some(entry => entry.id === 'trigger_event_selling')).toBe(true);
  });

  it('searches discovery question text', () => {
    const hits = searchLeadGenKnowledge('board cyber slide');
    expect(hits.some(entry => entry.id === 'board_slide_discovery_opener')).toBe(true);
  });

  it('returns full entry via tool handler', async () => {
    const result = await executeLeadGenKnowledgeTool({
      action: 'get_leadgen_entry',
      knowledgeId: 'predictable_revenue',
    });
    expect(result.ok).toBe(true);
    expect(getLeadGenEntry('predictable_revenue').authors).toContain('Aaron Ross');
  });

  it('filters corpus via tool list action', async () => {
    const result = await executeLeadGenKnowledgeTool({
      action: 'list_leadgen_knowledge',
      kind: 'book',
      limit: 5,
    });
    expect(result.ok).toBe(true);
    const entries = result.entries as { kind: string }[];
    expect(entries.every(entry => entry.kind === 'book')).toBe(true);
  });

  it('cross-references IronBoard playbooks on key entries', () => {
    const challengerTease = getLeadGenEntry('commercial_insight_outbound');
    expect(challengerTease.complementaryIronboardPlaybooks).toContain('challenger_sale');
  });

  it('rejects unknown knowledge ids', () => {
    expect(() => getLeadGenEntry('not_a_real_book')).toThrow();
  });

  it('filterLeadGenKnowledge combines category and query', () => {
    const filtered = filterLeadGenKnowledge({
      category: 'trigger_intelligence',
      query: 'NERC',
    });
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every(entry => entry.category === 'trigger_intelligence')).toBe(true);
  });
});
