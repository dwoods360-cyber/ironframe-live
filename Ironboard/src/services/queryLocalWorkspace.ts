import { getPrisma } from './prisma.js';
import { listProspects } from './marketIntelligence.js';

export type WorkspaceQueryType = 'active_prospects' | 'outreach_history' | 'flywheel_logs';

export const QUERY_LOCAL_WORKSPACE_DECLARATION = {
  name: 'queryLocalWorkspace',
  description:
    'Fetch live IronBoard workspace data from the local Prisma database: qualified GTM prospects, outreach pitch history, or market flywheel diagnostic logs. Use before recommending account-level strategy.',
  parameters: {
    type: 'OBJECT',
    properties: {
      queryType: {
        type: 'STRING',
        description: 'Which dataset to load.',
        enum: ['active_prospects', 'outreach_history', 'flywheel_logs'],
      },
      region: {
        type: 'STRING',
        description: 'Optional hub filter for active_prospects (London or Singapore).',
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

export async function executeQueryLocalWorkspace(
  raw: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const queryType = String(raw.queryType ?? '').trim() as WorkspaceQueryType;
  const limit = Math.min(Math.max(Number(raw.limit) || 10, 1), 50);

  try {
    switch (queryType) {
      case 'active_prospects': {
        const region = String(raw.region ?? '').trim() || undefined;
        const prospects = await listProspects(region, true);
        return {
          ok: true,
          queryType,
          count: prospects.length,
          prospects: prospects.slice(0, limit).map(p => ({
            id: p.id,
            companyName: p.companyName,
            domain: p.domain,
            region: p.region,
            employeeCount: p.employeeCount,
            dealStage: p.dealStage,
            aiFitnessScore: p.aiFitnessScore,
            icpScore: p.icpScore,
            compliancePressure: p.compliancePressure,
            recentFunding: p.recentFunding,
            hasComplianceJob: p.hasComplianceJob,
          })),
        };
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
        return {
          ok: true,
          queryType,
          count: rows.length,
          outreach: rows.map((r: (typeof rows)[number]) => ({
            id: r.id,
            prospectId: r.prospectId,
            companyName: r.prospect.companyName,
            domain: r.prospect.domain,
            timestamp: r.timestamp.toISOString(),
            valueProposition: r.valueProposition,
            generatedCopyPreview: r.generatedCopy.slice(0, 280),
          })),
        };
      }
      case 'flywheel_logs': {
        const prisma = getPrisma();
        const rows = await prisma.marketIntelligenceFlywheelLog.findMany({
          orderBy: { timestamp: 'desc' },
          take: limit,
        });
        return {
          ok: true,
          queryType,
          count: rows.length,
          logs: rows.map((r: (typeof rows)[number]) => ({
            id: r.id,
            component: r.component,
            message: r.message,
            timestamp: r.timestamp.toISOString(),
          })),
        };
      }
      default:
        return {
          ok: false,
          error: `Unknown queryType "${queryType}". Use active_prospects, outreach_history, or flywheel_logs.`,
        };
    }
  } catch (err) {
    return {
      ok: false,
      queryType,
      error: err instanceof Error ? err.message : 'Workspace query failed',
    };
  }
}

/** Primary entry point for the boardroom tool loop. */
export const queryLocalWorkspace = executeQueryLocalWorkspace;
