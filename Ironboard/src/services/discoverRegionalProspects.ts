import { GoogleGenAI } from '@google/genai';

import { getIronboardApiKey, getIronboardGeminiModel, isIronboardSemiAutonomousMode } from '../loadIronboardEnv.js';
import { withGeminiRateLimitRetry } from '../lib/geminiRetry.js';
import {
  assessRegionProspectAuthenticity,
  purgeSyntheticExpansionProspectsForRegion,
} from './marketProspectAuthenticity.js';
import { getPrisma } from './prisma.js';
import {
  listProspectsInRegions,
  scoreAndInsertProspect,
  findProspectById,
  type DealStage,
  type StoredProspect,
} from './marketIntelligence.js';
import { parseDiscoveryProspectsFromModelText } from './prospectDiscoveryNormalizer.js';

const MAX_CANDIDATES_PER_RUN = 5;

export type RegionalDiscoveryGenerateContentRequest = {
  model: string;
  contents: Array<{ role: string; parts: Array<{ text: string }> }>;
  config: {
    tools: Array<{ googleSearch: Record<string, never> }>;
    temperature: number;
    topP: number;
  };
};

export type RegionalDiscoveryGenerateContentResponse = {
  text?: string;
  candidates?: Array<{
    groundingMetadata?: { webSearchQueries?: string[] };
  }>;
};

export type RegionalDiscoveryDeps = {
  listProspects?: typeof listProspectsInRegions;
  scoreAndInsert?: typeof scoreAndInsertProspect;
  findProspect?: typeof findProspectById;
  getApiKey?: typeof getIronboardApiKey;
  getModel?: typeof getIronboardGeminiModel;
  isSemiAutonomous?: () => boolean;
  generateContent?: (
    request: RegionalDiscoveryGenerateContentRequest,
  ) => Promise<RegionalDiscoveryGenerateContentResponse>;
};

export type DiscoverRegionalProspectsOptions = {
  /** Operator flywheel / API trigger — bypasses semi-autonomous env gate. */
  operatorTriggered?: boolean;
};

export type DiscoverRegionalProspectsResult = {
  region: string;
  skipped: boolean;
  skipReason?: string;
  source: 'web_grounding' | 'skipped_threshold' | 'skipped_no_api_key' | 'skipped_parse_error' | 'skipped_semi_autonomous';
  ingested: StoredProspect[];
  candidatesParsed: number;
  groundingQueries?: string[];
};

function normalizeRegionLabel(region: string): string {
  const trimmed = region.trim();
  const key = trimmed.toLowerCase();
  if (key === 'london' || key === 'uk' || key === 'united kingdom') return 'London';
  if (key === 'singapore' || key === 'sg') return 'Singapore';
  if (key === 'us' || key === 'usa' || key === 'united states') return 'United States';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function buildDiscoveryPrompt(regionLabel: string): string {
  return [
    `Use live web search to find REAL public organizations headquartered or operating in ${regionLabel}.`,
    'Return ONLY companies verified via search results — legal name, real domain, public footprint.',
    '',
    'Beachhead segments (search criteria — do NOT copy names from this prompt; discover them):',
    '1. Regional bank holding companies: ~$10B–$100B consolidated assets; multi-affiliate structure; FFIEC/GLBA/BSA oversight.',
    '2. Public power / municipal utilities: NERC CIP or equivalent; 200–5,000 employees; OT/IT convergence.',
    '3. Regional community health systems: 500–5,000 employees; HIPAA/HITRUST; board cyber reporting pressure.',
    '',
    'FORBIDDEN: fictional startups, "{Region} Ledger/Vault" templates, invented domains, demo tenants (Medshield/Vaultbank/Gridcore).',
    '',
    'For each discovered company return EXACT JSON keys (no synonyms):',
    '- companyName — legal name from official site or regulator filing',
    '- domain — primary website hostname only (no path)',
    '- websiteUrl — full https URL',
    '- employeeCount — integer 50-15000 from public sources',
    '- compliancePressure — exactly "SOC2" or "ISO27001" (map FFIEC/GLBA/BSA/NERC→SOC2; HIPAA/HITRUST→ISO27001)',
    '- recentFunding — exactly SEED, SERIES_A, or NONE',
    '- hasComplianceJob — boolean',
    '- securityStanceSummary — one sentence from visible public sources',
    '',
    `Return ONLY valid JSON: {"prospects":[...]} with up to ${MAX_CANDIDATES_PER_RUN} distinct REAL companies.`,
  ].join('\n');
}

/**
 * Live web-grounded prospect discovery for expansion regions.
 * Skips only when the region has ≥3 **authentic** (non-synthetic) rows.
 * Polluted expansion-template rows are purged before a live pass.
 */
export async function discoverRegionalProspects(
  region: string,
  deps: RegionalDiscoveryDeps = {},
  options: DiscoverRegionalProspectsOptions = {},
): Promise<DiscoverRegionalProspectsResult> {
  const listProspects = deps.listProspects ?? listProspectsInRegions;
  const scoreAndInsert = deps.scoreAndInsert ?? scoreAndInsertProspect;
  const findProspect = deps.findProspect ?? findProspectById;
  const resolveApiKey = deps.getApiKey ?? getIronboardApiKey;
  const resolveModel = deps.getModel ?? getIronboardGeminiModel;
  const semiAutonomous = deps.isSemiAutonomous ?? isIronboardSemiAutonomousMode;
  const regionLabel = normalizeRegionLabel(region);

  if (!options.operatorTriggered && !semiAutonomous()) {
    return {
      region: regionLabel,
      skipped: true,
      skipReason: 'SEMI_AUTONOMOUS_MODE_DISABLED',
      source: 'skipped_semi_autonomous',
      ingested: [],
      candidatesParsed: 0,
    };
  }

  let existing = await listProspects([regionLabel], false);
  let assessment = assessRegionProspectAuthenticity(regionLabel, existing);

  if (assessment.polluted) {
    const purged = await purgeSyntheticExpansionProspectsForRegion(regionLabel);
    await logFlywheel(
      `discoverRegionalProspects ${regionLabel}: purged ${purged} synthetic expansion-template row(s) before live pass.`,
    );
    existing = await listProspects([regionLabel], false);
    assessment = assessRegionProspectAuthenticity(regionLabel, existing);
  }

  if (assessment.meetsAuthenticThreshold) {
    return {
      region: regionLabel,
      skipped: true,
      skipReason: 'REGION_AUTHENTIC_THRESHOLD_MET',
      source: 'skipped_threshold',
      ingested: [],
      candidatesParsed: 0,
    };
  }

  const apiKey = resolveApiKey();
  if (!apiKey && !deps.generateContent) {
    return {
      region: regionLabel,
      skipped: true,
      skipReason: 'MISSING_GOOGLE_API_KEY',
      source: 'skipped_no_api_key',
      ingested: [],
      candidatesParsed: 0,
    };
  }

  const model = resolveModel();

  let responseText = '';
  let groundingQueries: string[] | undefined;
  try {
    const request: RegionalDiscoveryGenerateContentRequest = {
      model,
      contents: [{ role: 'user', parts: [{ text: buildDiscoveryPrompt(regionLabel) }] }],
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0,
        topP: 0,
      },
    };
    const response = deps.generateContent
      ? await deps.generateContent(request)
      : await withGeminiRateLimitRetry(
          () => new GoogleGenAI({ apiKey: apiKey! }).models.generateContent(request),
          { label: `regional-prospect-${regionLabel}` },
        );
    responseText = response.text?.trim() ?? '';
    groundingQueries = response.candidates?.[0]?.groundingMetadata?.webSearchQueries;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await logFlywheel(`discoverRegionalProspects web grounding failed for ${regionLabel}: ${message}`);
    return {
      region: regionLabel,
      skipped: true,
      skipReason: message,
      source: 'skipped_parse_error',
      ingested: [],
      candidatesParsed: 0,
    };
  }

  const { candidates: parsedProspects, parseErrors } =
    parseDiscoveryProspectsFromModelText(responseText);
  if (!parsedProspects.length) {
    const message =
      parseErrors.length > 0
        ? parseErrors.join('; ')
        : 'No normalizable prospect rows in model response.';
    await logFlywheel(
      `discoverRegionalProspects parse failed for ${regionLabel}: ${message}; raw=${responseText.slice(0, 400)}`,
    );
    return {
      region: regionLabel,
      skipped: true,
      skipReason: message,
      source: 'skipped_parse_error',
      ingested: [],
      candidatesParsed: 0,
      groundingQueries,
    };
  }

  const ingested: StoredProspect[] = [];
  for (const candidate of parsedProspects) {
    const result = await scoreAndInsert({
      domain: candidate.domain,
      companyName: candidate.companyName,
      employeeCount: candidate.employeeCount,
      region: regionLabel,
      compliancePressure: candidate.compliancePressure,
      recentFunding: candidate.recentFunding ?? 'NONE',
      hasComplianceJob: candidate.hasComplianceJob === true,
      dealStage: 'PROSPECT' as DealStage,
    });
    if (result.status === 'SUCCESS' && result.id) {
      const row = await findProspect(result.id);
      if (row) ingested.push(row);
      if (candidate.securityStanceSummary?.trim()) {
        await logFlywheel(
          `WEB_DISCOVERY ${candidate.domain} (${regionLabel}): ${candidate.securityStanceSummary.trim()}`,
        );
      }
    }
  }

  await logFlywheel(
    `discoverRegionalProspects ${regionLabel}: ingested=${ingested.length} parsed=${parsedProspects.length}${parseErrors.length ? ` partial_errors=${parseErrors.length}` : ''}`,
  );

  return {
    region: regionLabel,
    skipped: false,
    source: 'web_grounding',
    ingested,
    candidatesParsed: parsedProspects.length,
    groundingQueries,
  };
}

async function logFlywheel(message: string): Promise<void> {
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
