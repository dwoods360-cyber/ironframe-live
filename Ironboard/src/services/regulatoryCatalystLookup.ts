import { getPrisma } from './prisma.js';

export const INDUSTRY_SCOUT_PROSPECT_CATALYST = 'INDUSTRY_SCOUT_PROSPECT_CATALYST' as const;

export type RegulatoryCatalystEnvelope = {
  classification: typeof INDUSTRY_SCOUT_PROSPECT_CATALYST;
  regulationId: string;
  authority: string;
  title: string;
  sourceUrl: string;
  matchedFramework: 'SOC2' | 'ISO27001';
  prospectDomain: string;
  prospectRegion: string;
  whyNow: string;
  ingestedAt: string;
  linkedAt: string;
};

function resolveBoardOrgTenantId(): string {
  return (
    process.env.IRONBOARD_BOARD_ORG_TENANT_UUID?.trim() || '5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01'
  );
}

/** Latest Industry Scout → prospect catalyst note from shared Postgres CRM. */
export async function findLatestRegulatoryCatalystForDomain(
  domain: string,
): Promise<RegulatoryCatalystEnvelope | null> {
  const tenantId = resolveBoardOrgTenantId();
  const needle = domain.trim().toLowerCase();
  const prisma = getPrisma();
  const rows = await prisma.ironboardCrmInteraction.findMany({
    where: {
      tenantId,
      channel: 'NOTE',
      summary: { contains: INDUSTRY_SCOUT_PROSPECT_CATALYST },
    },
    orderBy: { occurredAt: 'desc' },
    take: 40,
    select: { summary: true },
  });

  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.summary) as RegulatoryCatalystEnvelope;
      if (
        parsed.classification === INDUSTRY_SCOUT_PROSPECT_CATALYST &&
        parsed.prospectDomain?.toLowerCase() === needle
      ) {
        return parsed;
      }
    } catch {
      continue;
    }
  }
  return null;
}
