import { GoogleGenAI } from '@google/genai';
import { getIronboardApiKey, getIronboardGeminiModel } from './loadIronboardEnv.js';
import {
  buildStaticContextBundle,
  resolveCanonicalDetermination,
} from './staticContext.js';
import type { PanelAssembly, RoutedPanel } from './boardRouter.js';

const MOCK_FALLBACK =
  'The executive panel has logged the query and verified alignment with current operations.';

const SYSTEM_INSTRUCTION = `You are the IronBoard executive synthesis layer (port 8081, air-gapped).
You receive ONLY static, read-only corporate context. You have NO database, NO tenant data, NO live sales or client metrics.

Rules:
1. Answer ONLY using facts present in the static context block below.
2. Never invent product names, financial figures, client counts, or compliance statuses.
3. If the user asks for data not in the static context, state that live data-plane access is severed and cite what IS available statically.
4. Preserve BigInt cent baselines exactly as given — never convert to floats or dollars unless quoting the static registry verbatim.
5. Keep responses concise (3–6 sentences) unless the user asks for the four pillars blueprint (return it verbatim when asked).`;

export type DeliberationResult = {
  isAutoRouted: boolean;
  panelAssembly: PanelAssembly;
  determination: string;
  thinkingTraces: { cognitivePath: string };
  executionStatus: 'COMPLETE' | 'MOCK_FALLBACK' | 'CANONICAL';
  synthesisMode: 'canonical' | 'gemini' | 'mock';
};

function buildUserPrompt(query: string, routed: RoutedPanel): string {
  return [
    buildStaticContextBundle(),
    '',
    '--- ROUTING (PRE-COMPUTED; DO NOT CHANGE) ---',
    `Executive lead: ${routed.panel.executiveLead}`,
    `Primary framework: ${routed.panel.alignedPrimaryFramework}`,
    `Advisory council: ${routed.panel.advisoryCouncil.join('; ')}`,
    '',
    '--- EXECUTIVE QUERY ---',
    query.trim(),
  ].join('\n');
}

async function synthesizeWithGemini(query: string, routed: RoutedPanel): Promise<string | null> {
  const apiKey = getIronboardApiKey();
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: getIronboardGeminiModel(),
      contents: buildUserPrompt(query, routed),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.0,
        topP: 0.0,
        maxOutputTokens: 1024,
      },
    });
    const text = response.text?.trim();
    return text || null;
  } catch (err) {
    console.warn('[IRONBOARD] Gemini synthesis failed; using mock fallback.', err);
    return null;
  }
}

/**
 * Pure text synthesizer — static context + optional Gemini at temperature 0.
 * No Prisma, Supabase, or :3000 data-plane imports.
 */
export async function deliberateExecutiveQuery(
  query: string,
  explicitAgentId: string,
  routed: RoutedPanel,
): Promise<DeliberationResult> {
  const normalized = query.trim().toLowerCase();
  const canonical = resolveCanonicalDetermination(normalized);

  if (canonical) {
    return {
      isAutoRouted: routed.isAutoRouted,
      panelAssembly: routed.panel,
      determination: canonical,
      thinkingTraces: { cognitivePath: routed.cognitivePath },
      executionStatus: 'COMPLETE',
      synthesisMode: 'canonical',
    };
  }

  const geminiText = await synthesizeWithGemini(query, routed);
  if (geminiText) {
    return {
      isAutoRouted: routed.isAutoRouted,
      panelAssembly: routed.panel,
      determination: geminiText,
      thinkingTraces: { cognitivePath: routed.cognitivePath },
      executionStatus: 'COMPLETE',
      synthesisMode: 'gemini',
    };
  }

  return {
    isAutoRouted: routed.isAutoRouted,
    panelAssembly: routed.panel,
    determination: MOCK_FALLBACK,
    thinkingTraces: { cognitivePath: routed.cognitivePath },
    executionStatus: 'MOCK_FALLBACK',
    synthesisMode: 'mock',
  };
}
