import type { BeachheadSector } from '../../../Ironboard/src/types/crm.js';
import { getAllowlistedSource } from '../config/allowlistedSources.js';
import { loadIronleadsEnv } from '../loadIronleadsEnv.js';
import { getIronleadsPrisma } from '../lib/prisma.js';
import { sanitizeCompanyName, sanitizeDomain, sanitizeTrigger, stripHtml } from '../lib/sanitizer.js';

loadIronleadsEnv();

export type ExtractedSignal = {
  companyName: string;
  industrySector: BeachheadSector;
  detectedTrigger: string;
  contactEmail?: string;
  accountDomain?: string;
  confidenceScore: number;
};

const BEACHHEAD_KEYWORDS: Record<BeachheadSector, RegExp[]> = {
  REGIONAL_BHC: [
    /\bbancorp\b/i,
    /\bbank holding\b/i,
    /\bfinancial holding\b/i,
    /\bffiec\b/i,
    /\bglba\b/i,
  ],
  UTILITY_NERC: [/\butility\b/i, /\bnerc\b/i, /\belectric\b/i, /\bpower company\b/i, /\bgrid\b/i],
  MSSP_ENCLAVE: [/\bmssp\b/i, /\bmanaged security\b/i, /\bvciso\b/i, /\bfractional ciso\b/i],
  HEALTH_HIPAA: [/\bhospital\b/i, /\bhealthcare\b/i, /\bhipaa\b/i, /\bhealth system\b/i],
  UNCLASSIFIED: [],
};

const TRIGGER_PATTERNS: { trigger: string; pattern: RegExp; weight: number }[] = [
  { trigger: 'REG_FINE', pattern: /\b(enforcement|consent order|fine|penalty|cited for)\b/i, weight: 30 },
  { trigger: 'NEW_CISO', pattern: /\b(chief information security|ciso|csio)\b/i, weight: 28 },
  { trigger: 'COMPLIANCE_JOB_POST', pattern: /\b(hiring|job posting|seeking).{0,40}\b(grc|compliance|nerc|hipaa)\b/i, weight: 22 },
  { trigger: 'M_AND_A', pattern: /\b(merger|acquisition|acquires|merged with)\b/i, weight: 20 },
  { trigger: 'BREACH_DISCLOSURE', pattern: /\b(breach|ransomware|incident disclosure)\b/i, weight: 25 },
  { trigger: 'BOARD_MANDATE_DOLLAR_RISK', pattern: /\b(board|trustees).{0,50}\b(cyber|risk|dollar)\b/i, weight: 18 },
];

const COMPANY_PATTERNS = [
  /\b([A-Z][A-Za-z0-9&.,'()\-— ]{4,72}(?:Bancorporation|Bancorp|Bank|Corporation|Inc\.|LLC|Energy|Electric|Health|Security))\b/,
  /\b([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+){1,4} (?:Bank|Bancorp|Bancorporation|Utility|Health|Security))\b/,
];

function scoreBeachhead(text: string, fallback: BeachheadSector): { sector: BeachheadSector; score: number } {
  let best: BeachheadSector = fallback;
  let bestScore = 0;
  for (const sector of Object.keys(BEACHHEAD_KEYWORDS) as BeachheadSector[]) {
    if (sector === 'UNCLASSIFIED') continue;
    const hits = BEACHHEAD_KEYWORDS[sector].filter(rx => rx.test(text)).length;
    if (hits > bestScore) {
      bestScore = hits;
      best = sector;
    }
  }
  return { sector: best, score: bestScore };
}

function extractTriggers(text: string): string[] {
  const found: string[] = [];
  for (const entry of TRIGGER_PATTERNS) {
    if (entry.pattern.test(text)) found.push(entry.trigger);
  }
  return [...new Set(found)];
}

function extractCompanyName(text: string): string | null {
  for (const pattern of COMPANY_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const name = sanitizeCompanyName(match[1]);
      if (name.length >= 4) return name;
    }
  }
  const cleaned = stripHtml(text).slice(0, 200);
  const words = cleaned.split(/\s+/).slice(0, 6).join(' ');
  return words.length >= 4 ? sanitizeCompanyName(words) : null;
}

function extractDomain(text: string): string | undefined {
  const match = text.match(/\b([a-z0-9][a-z0-9.-]+\.(?:com|org|gov|net|io))\b/i);
  return sanitizeDomain(match?.[1]);
}

/** Agent L-02 — temperature-0 deterministic extraction (no LLM). */
export function extractSignalFromText(
  rawText: string,
  sourceId: string,
): ExtractedSignal | null {
  const text = stripHtml(rawText);
  const source = getAllowlistedSource(sourceId);
  const fallbackSector = source?.defaultBeachhead ?? 'UNCLASSIFIED';

  const companyName = extractCompanyName(text);
  if (!companyName) return null;

  const triggers = extractTriggers(text);
  if (triggers.length === 0) return null;

  const { sector, score: beachheadScore } = scoreBeachhead(text, fallbackSector);
  if (sector === 'UNCLASSIFIED') return null;

  let confidenceScore = 35 + beachheadScore * 10;
  for (const entry of TRIGGER_PATTERNS) {
    if (triggers.includes(entry.trigger)) confidenceScore += entry.weight;
  }
  confidenceScore = Math.min(100, confidenceScore);

  return {
    companyName,
    industrySector: sector,
    detectedTrigger: sanitizeTrigger(triggers.join(',')),
    accountDomain: extractDomain(text),
    confidenceScore,
  };
}

export type SignalFilterResult = {
  signalId: string;
  qualified: boolean;
  qualifiedLeadId?: string;
  dropReason?: string;
};

export async function runSignalFilter(limit = 20): Promise<SignalFilterResult[]> {
  const prisma = getIronleadsPrisma();
  const pending = await prisma.rawScrapedSignal.findMany({
    where: { processingStatus: 'UNPROCESSED' },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  const results: SignalFilterResult[] = [];

  for (const signal of pending) {
    const extracted = extractSignalFromText(signal.rawTextPayload, signal.sourceId);
    if (!extracted || extracted.confidenceScore < 45) {
      await prisma.rawScrapedSignal.update({
        where: { id: signal.id },
        data: {
          processingStatus: 'DROPPED',
          dropReason: extracted ? 'Confidence below threshold' : 'No company/trigger extracted',
        },
      });
      results.push({
        signalId: signal.id,
        qualified: false,
        dropReason: extracted ? 'LOW_CONFIDENCE' : 'EXTRACTION_FAILED',
      });
      continue;
    }

    const lead = await prisma.qualifiedLead.create({
      data: {
        signalId: signal.id,
        companyName: extracted.companyName,
        industrySector: extracted.industrySector,
        detectedTrigger: extracted.detectedTrigger,
        contactEmail: extracted.contactEmail ?? null,
        accountDomain: extracted.accountDomain ?? null,
        confidenceScore: extracted.confidenceScore,
      },
    });

    await prisma.rawScrapedSignal.update({
      where: { id: signal.id },
      data: { processingStatus: 'QUALIFIED' },
    });

    results.push({
      signalId: signal.id,
      qualified: true,
      qualifiedLeadId: lead.id,
    });
  }

  return results;
}
