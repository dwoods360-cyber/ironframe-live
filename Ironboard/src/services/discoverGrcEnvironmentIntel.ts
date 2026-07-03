import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

import { getIronboardApiKey, getIronboardGeminiModel } from '../loadIronboardEnv.js';
import { withGeminiRateLimitRetry } from '../lib/geminiRetry.js';

const ruleSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  authority: z.string().trim().min(1),
  sourceUrl: z.string().url(),
  effectiveOrDeadline: z.string().trim().min(1).optional(),
  whyNow: z.string().trim().min(1),
});

const segmentSchema = z.object({
  segment: z.enum(['regional_bhc', 'public_power', 'community_health']),
  segmentLabel: z.string().trim().min(1),
  primaryRegulators: z.array(z.string().trim().min(1)).min(1).max(6),
  frameworkPressure: z.enum(['SOC2', 'ISO27001']),
  activeRules: z.array(ruleSchema).min(1).max(4),
  enforcementTrend: z.string().trim().min(1).optional(),
});

const grcIntelSchema = z.object({
  region: z.string().trim().min(1),
  asOfNote: z.string().trim().min(1).optional(),
  segments: z.array(segmentSchema).min(1).max(3),
});

export type GrcEnvironmentIntel = z.infer<typeof grcIntelSchema>;

export type DiscoverGrcEnvironmentIntelResult = {
  region: string;
  skipped: boolean;
  skipReason?: string;
  source: 'web_grounding' | 'skipped_no_api_key' | 'skipped_parse_error';
  intel: GrcEnvironmentIntel | null;
  groundingQueries?: string[];
  rawExcerpt?: string;
};

function normalizeRegionLabel(region: string): string {
  const trimmed = region.trim();
  const key = trimmed.toLowerCase();
  if (key === 'london' || key === 'uk' || key === 'united kingdom') return 'United Kingdom';
  if (key === 'us' || key === 'usa' || key === 'united states') return 'United States';
  if (key === 'singapore' || key === 'sg') return 'Singapore';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function buildGrcIntelPrompt(regionLabel: string): string {
  return [
    `Use live web search to report the CURRENT GRC / regulatory environment in ${regionLabel} for these beachhead segments only:`,
    '1. regional_bhc — regional bank holding companies (~$10B–$100B assets; FFIEC/GLBA/BSA pressure)',
    '2. public_power — public power / municipal utilities (NERC CIP; OT/IT convergence)',
    '3. community_health — regional community health systems (HIPAA/HITRUST; board cyber reporting)',
    '',
    'RULES:',
    '- Every activeRules entry MUST cite a real regulator publication, rule, guidance, or enforcement action found in search — include sourceUrl from search.',
    '- Do NOT invent rule IDs, deadlines, or penalties. If evidence is thin, return fewer rules and say so in whyNow.',
    '- frameworkPressure MUST be exactly "SOC2" or "ISO27001" (map sector-native frameworks accordingly).',
    '- Return at most 3 activeRules per segment (prioritize highest-impact current rules).',
    '',
    'Return ONLY valid JSON with EXACT keys:',
    '{"region":"...","asOfNote":"...","segments":[{"segment":"regional_bhc","segmentLabel":"...","primaryRegulators":["..."],"frameworkPressure":"SOC2","activeRules":[{"id":"...","title":"...","authority":"...","sourceUrl":"https://...","effectiveOrDeadline":"...","whyNow":"..."}],"enforcementTrend":"..."}]}',
  ].join('\n');
}

function normalizeGrcIntelPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const obj = raw as Record<string, unknown>;
  const segments = Array.isArray(obj.segments)
    ? obj.segments.slice(0, 3).map(segment => {
        if (!segment || typeof segment !== 'object') return segment;
        const seg = segment as Record<string, unknown>;
        return {
          ...seg,
          primaryRegulators: Array.isArray(seg.primaryRegulators)
            ? seg.primaryRegulators.slice(0, 6)
            : seg.primaryRegulators,
          activeRules: Array.isArray(seg.activeRules) ? seg.activeRules.slice(0, 4) : seg.activeRules,
        };
      })
    : obj.segments;
  return { ...obj, segments };
}

function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const slice = fenced ?? text;
  const start = slice.indexOf('{');
  const end = slice.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON object found in model response.');
  return JSON.parse(slice.slice(start, end + 1));
}

export function formatGrcEnvironmentEnrichment(result: DiscoverGrcEnvironmentIntelResult): string {
  if (result.skipped || !result.intel) {
    return [
      `GRC ENVIRONMENT INTEL (${result.region}): unavailable — ${result.skipReason ?? result.source}.`,
      'Do NOT fabricate regulatory catalysts. State that live GRC prefetch did not return verified rules.',
    ].join(' ');
  }
  const lines = [
    `GRC ENVIRONMENT INTEL — LIVE WEB GROUNDING (${result.region})`,
    result.intel.asOfNote ? `As-of: ${result.intel.asOfNote}` : '',
    result.groundingQueries?.length
      ? `Search queries: ${result.groundingQueries.join('; ')}`
      : '',
  ].filter(Boolean);
  for (const segment of result.intel.segments) {
    lines.push(
      `Segment ${segment.segment} (${segment.segmentLabel}): regulators=${segment.primaryRegulators.join(', ')}; frameworkPressure=${segment.frameworkPressure}`,
    );
    for (const rule of segment.activeRules) {
      lines.push(
        `  - [${rule.authority}] ${rule.title} (${rule.id}) — ${rule.whyNow} Source: ${rule.sourceUrl}`,
      );
    }
    if (segment.enforcementTrend) {
      lines.push(`  Enforcement trend: ${segment.enforcementTrend}`);
    }
  }
  lines.push(
    'Cite only rules listed above with sourceUrl. Never invent regulatory deadlines or penalties.',
  );
  return lines.join('\n');
}

export async function discoverGrcEnvironmentIntel(
  region: string,
): Promise<DiscoverGrcEnvironmentIntelResult> {
  const regionLabel = normalizeRegionLabel(region);
  const apiKey = getIronboardApiKey();
  if (!apiKey) {
    return {
      region: regionLabel,
      skipped: true,
      skipReason: 'MISSING_GOOGLE_API_KEY',
      source: 'skipped_no_api_key',
      intel: null,
    };
  }

  const model = getIronboardGeminiModel();
  let responseText = '';
  let groundingQueries: string[] | undefined;
  try {
    const response = await withGeminiRateLimitRetry(
      () =>
        new GoogleGenAI({ apiKey }).models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: buildGrcIntelPrompt(regionLabel) }] }],
          config: {
            tools: [{ googleSearch: {} }],
            temperature: 0,
            topP: 0,
          },
        }),
      { label: `grc-environment-${regionLabel}` },
    );
    responseText = response.text?.trim() ?? '';
    groundingQueries = response.candidates?.[0]?.groundingMetadata?.webSearchQueries;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      region: regionLabel,
      skipped: true,
      skipReason: message,
      source: 'skipped_parse_error',
      intel: null,
    };
  }

  try {
    const intel = grcIntelSchema.parse(normalizeGrcIntelPayload(extractJsonObject(responseText)));
    return {
      region: regionLabel,
      skipped: false,
      source: 'web_grounding',
      intel,
      groundingQueries,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      region: regionLabel,
      skipped: true,
      skipReason: message,
      source: 'skipped_parse_error',
      intel: null,
      groundingQueries,
      rawExcerpt: responseText.slice(0, 600),
    };
  }
}
