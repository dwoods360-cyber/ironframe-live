import { GoogleGenAI } from '@google/genai';
import { getIronboardApiKey, getIronboardGeminiModel, loadIronboardEnv } from '../loadIronboardEnv.js';
import { getPrisma } from './prisma.js';

export type FundingStage = 'SEED' | 'SERIES_A' | 'NONE' | string;

const LONDON_BATCH: Omit<ProspectAccount, 'dealStage'>[] = [
  {
    domain: 'payflow-london.io',
    companyName: 'PayFlow London',
    employeeCount: 28,
    region: 'London',
    compliancePressure: 'SOC2',
    recentFunding: 'SERIES_A',
    hasComplianceJob: true,
  },
  {
    domain: 'ledgerbridge.uk',
    companyName: 'LedgerBridge UK',
    employeeCount: 12,
    region: 'London',
    compliancePressure: 'ISO27001',
    recentFunding: 'SEED',
    hasComplianceJob: false,
  },
  {
    domain: 'vaultpulse.finance',
    companyName: 'VaultPulse Finance',
    employeeCount: 41,
    region: 'London',
    compliancePressure: 'SOC2',
    recentFunding: 'NONE',
    hasComplianceJob: true,
  },
  {
    domain: 'regstack.io',
    companyName: 'RegStack',
    employeeCount: 19,
    region: 'London',
    compliancePressure: 'ISO27001',
    recentFunding: 'NONE',
    hasComplianceJob: false,
  },
];

const SINGAPORE_BATCH: Omit<ProspectAccount, 'dealStage'>[] = [
  {
    domain: 'finstack.sg',
    companyName: 'FinStack SG',
    employeeCount: 35,
    region: 'Singapore',
    compliancePressure: 'SOC2',
    recentFunding: 'SERIES_A',
    hasComplianceJob: true,
  },
  {
    domain: 'meridianpay.asia',
    companyName: 'Meridian Pay Asia',
    employeeCount: 22,
    region: 'Singapore',
    compliancePressure: 'ISO27001',
    recentFunding: 'SEED',
    hasComplianceJob: false,
  },
  {
    domain: 'chaincustody.sg',
    companyName: 'ChainCustody SG',
    employeeCount: 48,
    region: 'Singapore',
    compliancePressure: 'SOC2',
    recentFunding: 'NONE',
    hasComplianceJob: false,
  },
  {
    domain: 'compliance-lattice.io',
    companyName: 'Compliance Lattice',
    employeeCount: 14,
    region: 'Singapore',
    compliancePressure: 'ISO27001',
    recentFunding: 'NONE',
    hasComplianceJob: true,
  },
];

loadIronboardEnv();

export type DealStage = 'PROSPECT' | 'OUTREACHED' | 'QUALIFIED' | 'REJECTED';

export interface ProspectAccount {
  domain: string;
  companyName: string;
  employeeCount: number;
  region: string;
  compliancePressure: string;
  dealStage: DealStage;
  recentFunding?: FundingStage | null;
  hasComplianceJob?: boolean;
}

export type StoredProspect = {
  id: string;
  domain: string;
  companyName: string;
  employeeCount: number;
  region: string;
  compliancePressure: string;
  dealStage: string;
  /** Prisma `ai_fitness_score` — regional tier evaluation + harvest deltas. */
  aiFitnessScore: number;
  /** UI/API alias for dynamic ICP scoring (same source as aiFitnessScore). */
  icpScore: number;
  recentFunding: string | null;
  hasComplianceJob: boolean;
  updatedAt: Date;
};

const ACTIVE_PROSPECT_MIN_SCORE = 100;

function mapProspect(row: {
  id: string;
  domain: string;
  companyName: string;
  employeeCount: number;
  region: string;
  compliancePressure: string;
  dealStage: string;
  aiFitnessScore: number;
  recentFunding: string | null;
  hasComplianceJob: boolean;
  updatedAt: Date;
}): StoredProspect {
  return mapStoredProspect(row);
}

/** Maps Prisma row → API/UI prospect; icpScore mirrors aiFitnessScore (never list index). */
export function mapStoredProspect(row: {
  id: string;
  domain: string;
  companyName: string;
  employeeCount: number;
  region: string;
  compliancePressure: string;
  dealStage: string;
  aiFitnessScore: number;
  recentFunding: string | null;
  hasComplianceJob: boolean;
  updatedAt: Date;
}): StoredProspect {
  return {
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
  };
}

export function calculateTierScore(account: Pick<
  ProspectAccount,
  'region' | 'compliancePressure' | 'recentFunding' | 'hasComplianceJob'
>): number {
  let tierScore = 0;
  if (['London', 'Singapore'].includes(account.region)) tierScore += 50;
  if (['SOC2', 'ISO27001'].includes(account.compliancePressure)) tierScore += 50;
  const funding = String(account.recentFunding ?? 'NONE').trim().toUpperCase();
  if (funding === 'SEED' || funding === 'SERIES_A') tierScore += 100;
  if (account.hasComplianceJob === true) tierScore += 75;
  return tierScore;
}

export function resolveDealStageForScore(tierScore: number, requested?: DealStage): DealStage {
  if (tierScore < ACTIVE_PROSPECT_MIN_SCORE) return 'REJECTED';
  if (requested && requested !== 'REJECTED') return requested;
  return 'PROSPECT';
}

/** Cockpit-visible prospects only — excludes sub-threshold and REJECTED rows. */
export async function listProspects(region?: string, activeOnly = true): Promise<StoredProspect[]> {
  const prisma = getPrisma();
  const rows = await prisma.marketProspect.findMany({
    where: {
      ...(region ? { region } : {}),
      ...(activeOnly
        ? {
            dealStage: { not: 'REJECTED' },
            aiFitnessScore: { gte: ACTIVE_PROSPECT_MIN_SCORE },
          }
        : {}),
    },
    orderBy: { aiFitnessScore: 'desc' },
  });
  return rows.map(mapProspect);
}

export async function findProspectByDomain(domain: string): Promise<StoredProspect | null> {
  const prisma = getPrisma();
  const row = await prisma.marketProspect.findUnique({
    where: { domain: domain.trim().toLowerCase() },
  });
  return row ? mapProspect(row) : null;
}

export async function findProspectById(id: string): Promise<StoredProspect | null> {
  const prospectId = id.trim();
  if (!prospectId) return null;
  const prisma = getPrisma();
  const row = await prisma.marketProspect.findUnique({ where: { id: prospectId } });
  return row ? mapProspect(row) : null;
}

const HUB_TO_REGION: Record<string, 'London' | 'Singapore'> = {
  LONDON: 'London',
  SINGAPORE: 'Singapore',
};

function formatFundingTag(recentFunding: string | null, hasComplianceJob: boolean): string {
  const funding = recentFunding?.trim().toUpperCase() || 'NONE';
  const jobTag = hasComplianceJob ? 'compliance hire' : 'no compliance hire';
  return `${funding} · ${jobTag}`;
}

/** System-prompt block grounding Auto-Routing to the active flywheel hub + optional selected prospect. */
export async function buildFlywheelWorkspaceContext(
  activeHub?: string,
  selectedProspectId?: string,
): Promise<string | null> {
  const hubKey = String(activeHub ?? '').trim().toUpperCase();
  const region = HUB_TO_REGION[hubKey];
  if (!region) return null;

  let selectedAccount =
    'No specific account selected — analyze the loaded hub batch collectively and rank against the 5–50 employee Fintech SaaS ICP.';

  const prospectId = String(selectedProspectId ?? '').trim();
  if (prospectId) {
    const prospect = await findProspectById(prospectId);
    if (prospect) {
      selectedAccount = [
        prospect.companyName,
        `${prospect.employeeCount} employees`,
        `${prospect.compliancePressure} compliance pressure`,
        formatFundingTag(prospect.recentFunding, prospect.hasComplianceJob),
        `deal stage ${prospect.dealStage}`,
        `aiFitnessScore ${prospect.aiFitnessScore}`,
        `domain ${prospect.domain}`,
      ].join(', ');
    }
  }

  const batch = await listProspects(region, true);
  const batchSummary = batch.length
    ? batch
        .map(
          p =>
            `${p.companyName} (${p.employeeCount} emp, ${p.compliancePressure}, ${formatFundingTag(p.recentFunding, p.hasComplianceJob)}, score ${p.aiFitnessScore})`,
        )
        .join('; ')
    : 'Prisma returned zero qualified rows for this hub — report count=0 explicitly and tell the operator to click Load Prospecting Batch; never claim database or tool access is missing.';

  return [
    'CRITICAL WORKSPACE CONTEXT: The operator is currently staging a market entry campaign targeting early-stage Fintech SaaS startups.',
    `Active Hub: ${hubKey}.`,
    `Selected Target Account: ${selectedAccount}.`,
    `Loaded ${hubKey} qualified batch (5–50 employees, score ≥ ${ACTIVE_PROSPECT_MIN_SCORE}): ${batchSummary}.`,
    'Focus your strategy entirely on this scaling tier.',
    'Heavily penalize and reject any recommendations involving enterprise whales or multi-national corporations.',
    'When evaluating target quality, analyze ONLY this loaded fintech batch and lean-team constraints — never generic Fortune 500 banks or multinational entities.',
  ].join(' ');
}

/**
 * 1. AUTONOMOUS PROSPECTING & DYNAMIC SCORING
 */
export async function scoreAndInsertProspect(account: ProspectAccount) {
  if (account.employeeCount < 5 || account.employeeCount > 50) {
    return { status: 'SKIPPED' as const, reason: 'Out of ideal 5-50 scaling profile' };
  }

  const tierScore = calculateTierScore(account);
  const dealStage = resolveDealStageForScore(tierScore, account.dealStage);
  const domain = account.domain.trim().toLowerCase();
  const prisma = getPrisma();
  const fundingValue = account.recentFunding?.trim().toUpperCase() || null;
  const hasComplianceJob = account.hasComplianceJob === true;

  const savedProspect = await prisma.marketProspect.upsert({
    where: { domain },
    update: {
      companyName: account.companyName,
      employeeCount: account.employeeCount,
      region: account.region,
      compliancePressure: account.compliancePressure,
      recentFunding: fundingValue,
      hasComplianceJob,
      aiFitnessScore: tierScore,
      dealStage,
    },
    create: {
      domain,
      companyName: account.companyName,
      employeeCount: account.employeeCount,
      region: account.region,
      compliancePressure: account.compliancePressure,
      recentFunding: fundingValue,
      hasComplianceJob,
      dealStage,
      aiFitnessScore: tierScore,
    },
  });

  return {
    status: 'SUCCESS' as const,
    id: savedProspect.id,
    score: tierScore,
    dealStage: savedProspect.dealStage,
    excludedFromActive: tierScore < ACTIVE_PROSPECT_MIN_SCORE,
  };
}

export async function fetchProspectingBatch(region: 'London' | 'Singapore'): Promise<StoredProspect[]> {
  const seeds = region === 'London' ? LONDON_BATCH : SINGAPORE_BATCH;
  for (const seed of seeds) {
    await scoreAndInsertProspect({ ...seed, dealStage: 'PROSPECT' });
  }
  return listProspects(region, true);
}

export async function triggerProspectIngest(input: {
  region?: string;
  account?: ProspectAccount;
}): Promise<StoredProspect[]> {
  if (input.region === 'London' || input.region === 'Singapore') {
    return fetchProspectingBatch(input.region);
  }
  if (input.account) {
    await scoreAndInsertProspect(input.account);
    return listProspects(input.account.region, true);
  }
  throw new Error('Provide region (London | Singapore) or a full account payload.');
}

/**
 * 2. EXECUTING GROUNDED OUTREACH STAGING
 */
export async function generateGroundedPitch(domain: string) {
  const prospect = await findProspectByDomain(domain);
  if (!prospect) throw new Error('Target account domain not found.');
  if (prospect.dealStage === 'REJECTED' || prospect.aiFitnessScore < ACTIVE_PROSPECT_MIN_SCORE) {
    throw new Error('Target account failed financial qualification threshold.');
  }

  const apiKey = getIronboardApiKey();
  if (!apiKey) throw new Error('GOOGLE_API_KEY missing. Set it in Ironboard/.env.local.');

  const systemPrompt = `
    You are the Sales Strategy Director on a 17-agent corporate Board of Directors.
    Your current target is an early-stage Fintech SaaS startup under immediate regulatory crunch.
    Draft a cold outreach brief that offers our platform as a fractional, automated GRC expert.
    Highlight our absolute BigInt numeric precision and zero-drift database safety guarantees.
    DO NOT use generic marketing jargon. Keep it engineer-to-engineer.
  `;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: getIronboardGeminiModel(),
    contents: `Draft outreach for ${prospect.companyName} in ${prospect.region}. Impact focus: ${prospect.compliancePressure}. Funding: ${prospect.recentFunding ?? 'NONE'}. Compliance hiring signal: ${prospect.hasComplianceJob ? 'active' : 'none'}.`,
    config: { systemInstruction: systemPrompt },
  });

  const pitchText = response.text ?? '';
  const prisma = getPrisma();

  await prisma.outreachHistory.create({
    data: {
      prospectId: prospect.id,
      generatedCopy: pitchText,
      valueProposition: `BigInt Integrity + Autonomous ${prospect.compliancePressure} Guard`,
    },
  });

  return pitchText;
}

/**
 * 3. SPIN THE FLYWHEEL (SIGNAL HARVESTING)
 */
export async function harvestInteractionSignal(domain: string, _responseText: string, isPositive: boolean) {
  const prospect = await findProspectByDomain(domain);
  if (!prospect) throw new Error('Prospect not found.');

  const scoreModifier = isPositive ? 25 : -25;
  const nextStage: DealStage = isPositive ? 'QUALIFIED' : 'REJECTED';
  const prisma = getPrisma();

  const updated = await prisma.marketProspect.update({
    where: { domain: domain.trim().toLowerCase() },
    data: {
      aiFitnessScore: { increment: scoreModifier },
      dealStage: nextStage,
    },
  });

  await prisma.marketIntelligenceFlywheelLog.create({
    data: {
      component: 'MARKET_INTELLIGENCE_FLYWHEEL',
      message: `Processed signal for ${domain}. Outcome positive: ${isPositive}. Score shifted by ${scoreModifier}.`,
    },
  });

  return {
    domain,
    newStatus: nextStage,
    aiFitnessScore: updated.aiFitnessScore,
    icpScore: updated.aiFitnessScore,
  };
}
