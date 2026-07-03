import { getPrisma } from './prisma.js';
import {
  discoverRegionalProspects,
  type DiscoverRegionalProspectsResult,
} from './discoverRegionalProspects.js';
import type { StoredProspect } from './marketIntelligence.js';

export const DISCOVERY_AUTHENTIC_ROW_THRESHOLD = 3;

export const EXPANSION_TEMPLATE_LEDGER_EMPLOYEES = 24;
export const EXPANSION_TEMPLATE_VAULT_EMPLOYEES = 18;

export type MarketProspectAuthenticitySlice = Pick<
  StoredProspect,
  'companyName' | 'domain' | 'employeeCount' | 'region'
>;

export type RegionAuthenticityAssessment = {
  region: string;
  totalRows: number;
  syntheticCount: number;
  authenticCount: number;
  polluted: boolean;
  meetsAuthenticThreshold: boolean;
};

export type VerifyAndOptimizeMarketDataResult = {
  region: string;
  assessment: RegionAuthenticityAssessment;
  syntheticPurged: number;
  discovery: DiscoverRegionalProspectsResult | null;
  action: 'verified' | 'purged_synthetic' | 'live_discovery' | 'purged_and_discovered';
};

/** Classroom / cockpit curated fiction — never present as live market research. */
export const CURATED_DEMO_SEED_DOMAINS = new Set([
  'payflow-london.io',
  'ledgerbridge.uk',
  'vaultpulse.finance',
  'regstack.io',
  'finstack.sg',
  'meridianpay.asia',
  'chaincustody.sg',
  'compliance-lattice.io',
]);

/** Detect auto-generated `{Region} Ledger` / `{Region} Vault` expansion templates. */
export function isSyntheticExpansionTemplateProspect(
  prospect: MarketProspectAuthenticitySlice,
): boolean {
  const name = prospect.companyName.trim();
  const domain = prospect.domain.trim().toLowerCase();

  if (/-ledger\.io$/.test(domain) || /-vault\.finance$/.test(domain)) {
    return true;
  }

  if (/^.+ Ledger$/.test(name) && prospect.employeeCount === EXPANSION_TEMPLATE_LEDGER_EMPLOYEES) {
    return true;
  }

  if (/^.+ Vault$/.test(name) && prospect.employeeCount === EXPANSION_TEMPLATE_VAULT_EMPLOYEES) {
    return true;
  }

  return false;
}

export function isCuratedDemoSeedProspect(prospect: MarketProspectAuthenticitySlice): boolean {
  return CURATED_DEMO_SEED_DOMAINS.has(prospect.domain.trim().toLowerCase());
}

export function isNonAuthenticProspect(prospect: MarketProspectAuthenticitySlice): boolean {
  return isSyntheticExpansionTemplateProspect(prospect) || isCuratedDemoSeedProspect(prospect);
}

export function assessRegionProspectAuthenticity(
  region: string,
  rows: MarketProspectAuthenticitySlice[],
): RegionAuthenticityAssessment {
  const syntheticCount = rows.filter(isNonAuthenticProspect).length;
  const authenticCount = rows.length - syntheticCount;
  return {
    region,
    totalRows: rows.length,
    syntheticCount,
    authenticCount,
    polluted: syntheticCount > 0,
    meetsAuthenticThreshold: authenticCount >= DISCOVERY_AUTHENTIC_ROW_THRESHOLD,
  };
}

type MarketProspectDbRow = MarketProspectAuthenticitySlice & {
  id: string;
  compliancePressure: string;
  dealStage: string;
  aiFitnessScore: number;
  recentFunding: string | null;
  hasComplianceJob: boolean;
  updatedAt: Date;
};

export async function listProspectRowsForRegion(region: string): Promise<StoredProspect[]> {
  const prisma = getPrisma();
  const rows = (await prisma.marketProspect.findMany({
    where: { region },
    orderBy: { aiFitnessScore: 'desc' },
  })) as MarketProspectDbRow[];
  return rows.map((row) => ({
    id: row.id,
    domain: row.domain,
    companyName: row.companyName,
    employeeCount: row.employeeCount,
    region: row.region,
    compliancePressure: row.compliancePressure,
    dealStage: row.dealStage,
    aiFitnessScore: row.aiFitnessScore,
    icpScore: row.aiFitnessScore,
    recentFunding: row.recentFunding,
    hasComplianceJob: row.hasComplianceJob,
    updatedAt: row.updatedAt,
  }));
}

export async function purgeSyntheticExpansionProspectsForRegion(region: string): Promise<number> {
  const prisma = getPrisma();
  const rows = (await prisma.marketProspect.findMany({
    where: { region },
    select: { id: true, companyName: true, domain: true, employeeCount: true, region: true },
  })) as Array<MarketProspectAuthenticitySlice & { id: string }>;
  const syntheticIds = rows
    .filter((row) => isNonAuthenticProspect(row))
    .map((row) => row.id);
  if (!syntheticIds.length) return 0;
  await prisma.marketProspect.deleteMany({ where: { id: { in: syntheticIds } } });
  return syntheticIds.length;
}

async function logAuthenticityAction(message: string): Promise<void> {
  try {
    const prisma = getPrisma();
    await prisma.marketIntelligenceFlywheelLog.create({
      data: {
        component: 'MARKET_INTELLIGENCE_FLYWHEEL',
        message,
      },
    });
  } catch {
    /* best-effort */
  }
}

/**
 * Board autonomy gate: inspect row quality, purge expansion templates, and force live web
 * discovery when the region is polluted or below the authentic-row threshold.
 */
export async function verifyAndOptimizeMarketData(
  region: string,
  options: { operatorTriggered?: boolean } = {},
): Promise<VerifyAndOptimizeMarketDataResult> {
  const regionLabel = region.trim();
  const beforeRows = await listProspectRowsForRegion(regionLabel);
  const assessment = assessRegionProspectAuthenticity(regionLabel, beforeRows);

  const needsLivePass = assessment.polluted || !assessment.meetsAuthenticThreshold;
  if (!needsLivePass) {
    return {
      region: regionLabel,
      assessment,
      syntheticPurged: 0,
      discovery: null,
      action: 'verified',
    };
  }

  let syntheticPurged = 0;
  if (assessment.polluted) {
    syntheticPurged = await purgeSyntheticExpansionProspectsForRegion(regionLabel);
    await logAuthenticityAction(
      `[Board Autonomy] Purged ${syntheticPurged} synthetic expansion-template row(s) for ${regionLabel}.`,
    );
  }

  const discovery = await discoverRegionalProspects(regionLabel, {}, options);
  const afterRows = await listProspectRowsForRegion(regionLabel);
  const afterAssessment = assessRegionProspectAuthenticity(regionLabel, afterRows);

  if (!discovery.skipped) {
    await logAuthenticityAction(
      `[Board Autonomy] Live web discovery for ${regionLabel}: ingested=${discovery.ingested.length} parsed=${discovery.candidatesParsed}.`,
    );
  }

  return {
    region: regionLabel,
    assessment: afterAssessment,
    syntheticPurged,
    discovery,
    action:
      syntheticPurged > 0 && !discovery.skipped
        ? 'purged_and_discovered'
        : syntheticPurged > 0
          ? 'purged_synthetic'
          : 'live_discovery',
  };
}

export type ProspectDataLineage =
  | 'LIVE_WEB_GROUNDING'
  | 'SYNTHETIC_SCAFFOLDING'
  | 'CURATED_DEMO_SEED'
  | 'LIVE_CANDIDATE';

export function formatProspectLineage(prospect: MarketProspectAuthenticitySlice): ProspectDataLineage {
  if (isCuratedDemoSeedProspect(prospect)) return 'CURATED_DEMO_SEED';
  if (isSyntheticExpansionTemplateProspect(prospect)) return 'SYNTHETIC_SCAFFOLDING';
  return 'LIVE_CANDIDATE';
}
