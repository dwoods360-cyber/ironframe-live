import { GoogleGenAI } from '@google/genai';
import { getIronboardApiKey, getIronboardGeminiModel } from './loadIronboardEnv.js';
import { buildStaticContextBundle } from './staticContext.js';
import {
  DYNAMIC_DISCOVERY_MANDATE,
  type DiscoveryContext,
  type PanelAssembly,
  type RoutedPanel,
} from './boardRouter.js';
import {
  formatDiscoveryEvidence,
  runDynamicDiscovery,
  summarizeDiscoveryFailures,
  summarizeEmptyDiscoveryStates,
} from './services/dynamicDiscovery.js';

const SYSTEM_INSTRUCTION = `${DYNAMIC_DISCOVERY_MANDATE}

You are the IronBoard executive synthesis layer. You MUST anchor every capability claim, metric, CRM status, and system profile to the DISCOVERY VERIFICATION LOG provided in the user prompt. Never invent features, counts, or availability without citing a matching tool receipt.

Rules:
1. Treat discovery tool payloads as ground truth. Do not contradict successful tool outputs.
2. When a tool returns ok=true with empty arrays or zero counts, state explicitly that the subsystem exists and is reachable but is currently unpopulated — never claim the platform lacks that feature.
3. When discovery tools fail, report the tool error verbatim and do not substitute generic reassurance.
4. Preserve BigInt cent values exactly as returned — never convert to floats.
5. Keep responses concise (3–8 sentences) unless the user requests exhaustive detail.`;

export type DeliberationResult = {
  isAutoRouted: boolean;
  panelAssembly: PanelAssembly;
  determination: string;
  thinkingTraces: { cognitivePath: string; discoveryIntents: string[] };
  executionStatus: 'COMPLETE' | 'DISCOVERY_ONLY' | 'DISCOVERY_FAILED';
  synthesisMode: 'gemini' | 'discovery_only';
};

function buildUserPrompt(
  query: string,
  routed: RoutedPanel,
  discoveryBlock: string,
  emptyStates: string[],
  failures: string[],
): string {
  return [
    buildStaticContextBundle(),
    '',
    DYNAMIC_DISCOVERY_MANDATE,
    '',
    '--- DISCOVERY VERIFICATION LOG (AUTHORITATIVE) ---',
    discoveryBlock,
    emptyStates.length ? `\nEMPTY STATE NOTES:\n${emptyStates.join('\n')}` : '',
    failures.length ? `\nDISCOVERY FAILURES:\n${failures.join('\n')}` : '',
    '',
    '--- ROUTING (PRE-COMPUTED; DO NOT CHANGE) ---',
    `Executive lead: ${routed.panel.executiveLead}`,
    `Primary framework: ${routed.panel.alignedPrimaryFramework}`,
    `Advisory council: ${routed.panel.advisoryCouncil.join('; ')}`,
    '',
    '--- EXECUTIVE QUERY ---',
    query.trim(),
  ]
    .filter(Boolean)
    .join('\n');
}

function buildDiscoveryOnlyDetermination(
  query: string,
  discoveryBlock: string,
  emptyStates: string[],
  failures: string[],
): string {
  const parts = [
    'Dynamic discovery completed; Gemini synthesis is unavailable (missing or invalid GOOGLE_API_KEY).',
    '',
    'Verification log:',
    discoveryBlock,
  ];
  if (emptyStates.length) {
    parts.push('', 'Empty-state interpretation:', ...emptyStates);
  }
  if (failures.length) {
    parts.push('', 'Tool failures:', ...failures);
  }
  parts.push('', `Original query: ${query.trim()}`);
  return parts.join('\n');
}

async function synthesizeWithGemini(
  query: string,
  routed: RoutedPanel,
  discoveryBlock: string,
  emptyStates: string[],
  failures: string[],
): Promise<string | null> {
  const apiKey = getIronboardApiKey();
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: getIronboardGeminiModel(),
      contents: buildUserPrompt(query, routed, discoveryBlock, emptyStates, failures),
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
    console.warn('[IRONBOARD] Gemini synthesis failed after discovery.', err);
    return null;
  }
}

/**
 * Discovery-first synthesizer — mandatory tool execution before any board determination.
 */
export async function deliberateExecutiveQuery(
  query: string,
  _explicitAgentId: string,
  routed: RoutedPanel,
  discoveryContext: DiscoveryContext = {},
): Promise<DeliberationResult> {
  const { plan, receipts } = await runDynamicDiscovery(query, discoveryContext);
  const discoveryBlock = formatDiscoveryEvidence(receipts);
  const emptyStates = summarizeEmptyDiscoveryStates(receipts);
  const failures = summarizeDiscoveryFailures(receipts);

  const geminiText = await synthesizeWithGemini(query, routed, discoveryBlock, emptyStates, failures);
  if (geminiText) {
    return {
      isAutoRouted: routed.isAutoRouted,
      panelAssembly: routed.panel,
      determination: geminiText,
      thinkingTraces: { cognitivePath: routed.cognitivePath, discoveryIntents: plan.intents },
      executionStatus: failures.length && !receipts.some(r => r.ok) ? 'DISCOVERY_FAILED' : 'COMPLETE',
      synthesisMode: 'gemini',
    };
  }

  return {
    isAutoRouted: routed.isAutoRouted,
    panelAssembly: routed.panel,
    determination: buildDiscoveryOnlyDetermination(query, discoveryBlock, emptyStates, failures),
    thinkingTraces: { cognitivePath: routed.cognitivePath, discoveryIntents: plan.intents },
    executionStatus: failures.length ? 'DISCOVERY_FAILED' : 'DISCOVERY_ONLY',
    synthesisMode: 'discovery_only',
  };
}
