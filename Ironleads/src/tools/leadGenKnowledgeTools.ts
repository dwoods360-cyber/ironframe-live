import {
  filterLeadGenKnowledge,
  getLeadGenEntry,
  IRONLEADS_KNOWLEDGE_MANIFEST,
  listLeadGenSummaries,
} from '../knowledge/index.js';

export const LEADGEN_KNOWLEDGE_TOOL_ACTIONS = ['list_leadgen_knowledge', 'get_leadgen_entry'] as const;

export type LeadGenKnowledgeToolAction = (typeof LEADGEN_KNOWLEDGE_TOOL_ACTIONS)[number];

export async function executeLeadGenKnowledgeTool(
  raw: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const action = String(raw.action ?? '').trim() as LeadGenKnowledgeToolAction;

  try {
    switch (action) {
      case 'list_leadgen_knowledge': {
        const limit = Math.min(Math.max(Number(raw.limit) || 50, 1), 100);
        const entries = filterLeadGenKnowledge({
          category: String(raw.category ?? '').trim() || undefined,
          kind: String(raw.kind ?? '').trim() || undefined,
          beachheadSector: String(raw.beachheadSector ?? '').trim() || undefined,
          trigger: String(raw.trigger ?? '').trim() || undefined,
          query: String(raw.searchQuery ?? raw.query ?? '').trim() || undefined,
        }).slice(0, limit);
        return {
          ok: true,
          action,
          manifest: IRONLEADS_KNOWLEDGE_MANIFEST,
          count: entries.length,
          summaries: listLeadGenSummaries(),
          entries,
        };
      }
      case 'get_leadgen_entry': {
        const id = String(raw.knowledgeId ?? raw.id ?? '').trim();
        if (!id) throw new Error('knowledgeId is required');
        return {
          ok: true,
          action,
          manifest: IRONLEADS_KNOWLEDGE_MANIFEST,
          entry: getLeadGenEntry(id),
        };
      }
      default:
        return {
          ok: false,
          error: `Unknown action "${action}". Use list_leadgen_knowledge or get_leadgen_entry.`,
        };
    }
  } catch (err) {
    return {
      ok: false,
      action,
      error: err instanceof Error ? err.message : 'Lead-gen knowledge query failed',
    };
  }
}
