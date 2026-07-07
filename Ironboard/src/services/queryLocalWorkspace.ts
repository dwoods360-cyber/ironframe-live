import { getPrisma } from './prisma.js';
import { listProspects, listProspectsInRegions } from './marketIntelligence.js';
import type { StoredProspect } from './marketIntelligence.js';
import { formatProspectLineage } from './marketProspectAuthenticity.js';

export type WorkspaceQueryType =
  | 'active_prospects'
  | 'outreach_history'
  | 'flywheel_logs'
  | 'ironleads_knowledge';

export const WORKSPACE_DATA_STATE = {
  POPULATED: 'POPULATED',
  PROVISIONED_EMPTY: 'PROVISIONED_EMPTY',
} as const;

export type WorkspaceDataState = (typeof WORKSPACE_DATA_STATE)[keyof typeof WORKSPACE_DATA_STATE];

export const QUERY_LOCAL_WORKSPACE_DECLARATION = {
  name: 'queryLocalWorkspace',
  description:
    'Fetch live IronBoard workspace data from the local Prisma database: qualified GTM prospects, outreach pitch history, market flywheel diagnostic logs, or the Ironleads lead-generation knowledge corpus (books, strategies, OSINT playbooks). Use before recommending account-level strategy. Region filters accept any market label (country, city, or campaign geography) — not limited to legacy hubs.',
  parameters: {
    type: 'OBJECT',
    properties: {
      queryType: {
        type: 'STRING',
        description:
          'Which dataset to load: active_prospects, outreach_history, flywheel_logs, or ironleads_knowledge.',
      },
      category: {
        type: 'STRING',
        description:
          'For ironleads_knowledge: filter by category (outbound_prospecting, trigger_intelligence, etc.).',
      },
      kind: {
        type: 'STRING',
        description: 'For ironleads_knowledge: filter by entry kind — book, strategy, or framework.',
      },
      beachheadSector: {
        type: 'STRING',
        description:
          'For ironleads_knowledge: filter by beachhead (REGIONAL_BHC, UTILITY_NERC, MSSP_ENCLAVE, HEALTH_HIPAA).',
      },
      trigger: {
        type: 'STRING',
        description:
          'For ironleads_knowledge: filter by trigger signal (REG_FINE, NEW_CISO, etc.).',
      },
      knowledgeId: {
        type: 'STRING',
        description: 'For ironleads_knowledge: return one full entry by id when set.',
      },
      searchQuery: {
        type: 'STRING',
        description: 'For ironleads_knowledge: full-text search across titles, tactics, and concepts.',
      },
      region: {
        type: 'STRING',
        description:
          'Optional single market filter for active_prospects (free-text geography, e.g. Germany, U.S., Canada, London).',
      },
      regions: {
        type: 'ARRAY',
        items: { type: 'STRING' },
        description:
          'Optional multi-market filter for active_prospects (e.g. ["Germany", "Australia", "U.S."]).',
      },
      prospectId: {
        type: 'STRING',
        description: 'Optional UUID filter for outreach_history rows tied to one prospect.',
      },
      limit: {
        type: 'NUMBER',
        description: 'Maximum rows to return (1–50, default 10).',
      },
    },
    required: ['queryType'],
  },
};

/** Coerce monetary BigInt fields to stringified whole-cent integers for agent-safe JSON. */
export function stringifyWorkspaceBigIntFields(
  value: unknown,
): string | number | boolean | null | Record<string, unknown> | unknown[] {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(item => stringifyWorkspaceBigIntFields(item));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] =
        typeof entry === 'bigint' ||
        (typeof entry === 'number' && /cents$/i.test(key) && Number.isFinite(entry))
          ? String(entry)
          : stringifyWorkspaceBigIntFields(entry);
    }
    return out;
  }
  return value as string | number | boolean | null;
}

function formatProspectRow(prospect: StoredProspect): Record<string, unknown> {
  return stringifyWorkspaceBigIntFields({
    id: prospect.id,
    companyName: prospect.companyName,
    domain: prospect.domain,
    region: prospect.region,
    employeeCount: prospect.employeeCount,
    dealStage: prospect.dealStage,
    aiFitnessScore: prospect.aiFitnessScore,
    icpScore: prospect.icpScore,
    compliancePressure: prospect.compliancePressure,
    recentFunding: prospect.recentFunding,
    hasComplianceJob: prospect.hasComplianceJob,
    dataLineage: formatProspectLineage(prospect),
  }) as Record<string, unknown>;
}

function resolveActiveProspectScope(raw: Record<string, unknown>): {
  region?: string;
  regions: string[];
} {
  const regions = Array.isArray(raw.regions)
    ? raw.regions.map(value => String(value).trim()).filter(Boolean)
    : [];
  const region = String(raw.region ?? '').trim() || undefined;
  return { region, regions };
}

function buildActiveProspectsResponse(params: {
  queryType: WorkspaceQueryType;
  region?: string;
  regions: string[];
  prospects: StoredProspect[];
  limit: number;
}): Record<string, unknown> {
  const { queryType, region, regions, prospects, limit } = params;
  const scopedRegions = regions.length > 0 ? regions : region ? [region] : [];
  const rows = prospects.slice(0, limit).map(formatProspectRow);
  const dataState: WorkspaceDataState =
    rows.length > 0 ? WORKSPACE_DATA_STATE.POPULATED : WORKSPACE_DATA_STATE.PROVISIONED_EMPTY;

  return {
    ok: true,
    success: true,
    queryType,
    count: rows.length,
    region: region ?? scopedRegions[0] ?? null,
    regions: scopedRegions.length > 0 ? scopedRegions : null,
    dataState,
    prospects: rows,
    ...(dataState === WORKSPACE_DATA_STATE.PROVISIONED_EMPTY
      ? {
          message:
            'Workspace prospect channel is provisioned; no qualified rows match the requested market filter yet. Board autonomy may have executed live web discovery — report MARKET AUTHENTICITY OPTIMIZATION receipts; do not instruct the operator to run batch loaders manually.',
        }
      : {}),
  };
}

export async function executeQueryLocalWorkspace(
  raw: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const queryType = String(raw.queryType ?? '').trim() as WorkspaceQueryType;
  const limit = Math.min(Math.max(Number(raw.limit) || 10, 1), 50);

  try {
    switch (queryType) {
      case 'active_prospects': {
        const { region, regions } = resolveActiveProspectScope(raw);
        const prospects =
          regions.length > 0
            ? await listProspectsInRegions(regions, true)
            : await listProspects(region, true);
        return buildActiveProspectsResponse({
          queryType,
          region,
          regions,
          prospects,
          limit,
        });
      }
      case 'outreach_history': {
        const prisma = getPrisma();
        const prospectId = String(raw.prospectId ?? '').trim() || undefined;
        const rows = await prisma.outreachHistory.findMany({
          where: prospectId ? { prospectId } : undefined,
          include: { prospect: { select: { companyName: true, domain: true } } },
          orderBy: { timestamp: 'desc' },
          take: limit,
        });
        const outreach = rows.map((r: (typeof rows)[number]) =>
          stringifyWorkspaceBigIntFields({
            id: r.id,
            prospectId: r.prospectId,
            companyName: r.prospect.companyName,
            domain: r.prospect.domain,
            timestamp: r.timestamp.toISOString(),
            valueProposition: r.valueProposition,
            generatedCopyPreview: r.generatedCopy.slice(0, 280),
          }),
        );
        return {
          ok: true,
          success: true,
          queryType,
          count: outreach.length,
          dataState:
            outreach.length > 0
              ? WORKSPACE_DATA_STATE.POPULATED
              : WORKSPACE_DATA_STATE.PROVISIONED_EMPTY,
          outreach,
        };
      }
      case 'flywheel_logs': {
        const prisma = getPrisma();
        const rows = await prisma.marketIntelligenceFlywheelLog.findMany({
          orderBy: { timestamp: 'desc' },
          take: limit,
        });
        const logs = rows.map((r: (typeof rows)[number]) =>
          stringifyWorkspaceBigIntFields({
            id: r.id,
            component: r.component,
            message: r.message,
            timestamp: r.timestamp.toISOString(),
          }),
        );
        return {
          ok: true,
          success: true,
          queryType,
          count: logs.length,
          dataState:
            logs.length > 0 ? WORKSPACE_DATA_STATE.POPULATED : WORKSPACE_DATA_STATE.PROVISIONED_EMPTY,
          logs,
        };
      }
      case 'ironleads_knowledge': {
        const {
          filterLeadGenKnowledge,
          getLeadGenEntry,
          IRONLEADS_KNOWLEDGE_MANIFEST,
          listLeadGenSummaries,
        } = await import('../../../Ironleads/src/knowledge/index.js');

        const knowledgeId = String(raw.knowledgeId ?? '').trim();
        if (knowledgeId) {
          const entry = getLeadGenEntry(knowledgeId);
          return {
            ok: true,
            success: true,
            queryType,
            manifest: IRONLEADS_KNOWLEDGE_MANIFEST,
            entry,
          };
        }

        const entries = filterLeadGenKnowledge({
          category: String(raw.category ?? '').trim() || undefined,
          kind: String(raw.kind ?? '').trim() || undefined,
          beachheadSector: String(raw.beachheadSector ?? '').trim() || undefined,
          trigger: String(raw.trigger ?? '').trim() || undefined,
          query: String(raw.searchQuery ?? raw.query ?? '').trim() || undefined,
        }).slice(0, limit);

        return {
          ok: true,
          success: true,
          queryType,
          count: entries.length,
          manifest: IRONLEADS_KNOWLEDGE_MANIFEST,
          summaries: listLeadGenSummaries().slice(0, limit),
          entries,
          dataState: WORKSPACE_DATA_STATE.POPULATED,
        };
      }
      default:
        return {
          ok: false,
          success: false,
          error: `Unknown queryType "${queryType}". Use active_prospects, outreach_history, flywheel_logs, or ironleads_knowledge.`,
        };
    }
  } catch (err) {
    return {
      ok: false,
      success: false,
      queryType,
      error: err instanceof Error ? err.message : 'Workspace query failed',
    };
  }
}

/** Primary entry point for the boardroom tool loop. */
export const queryLocalWorkspace = executeQueryLocalWorkspace;
