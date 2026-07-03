import { GoogleGenAI } from '@google/genai';
import { getIronboardApiKey, getIronboardGeminiModel } from './loadIronboardEnv.js';
import { buildStaticContextBundle } from './staticContext.js';
import {
  BOARD_CONVERSATIONAL_BOUNDARY,
  BOARD_CRM_TOOL_MANDATE,
  BOARD_EXECUTION_LAYER_PERSONA,
  BOARD_VIDEO_INTELLIGENCE_MANDATE,
  DYNAMIC_DISCOVERY_MANDATE,
  resolveCanonicalBoardResponse,
  type DiscoveryContext,
  type PanelAssembly,
  type RoutedPanel,
} from './boardRouter.js';
import { BOARD_GTM_MARKET_AUTHENTICITY_MANDATE } from './services/boardroomSystemPrompt.js';
import {
  BOARD_MARKET_TRUTH_MANDATE,
  BOARD_LIVE_DISCOVERY_ONLY_MANDATE,
} from './config/boardMarketTruthMandate.js';
import { TOOL_RESULT_PARSE_DIRECTIVE } from './services/boardResponseLibrary.js';
import {
  formatDiscoveryEvidence,
  runDynamicDiscovery,
  summarizeDiscoveryFailures,
  summarizeEmptyDiscoveryStates,
  synthesizePlaybookInventoryFromDiscovery,
} from './services/dynamicDiscovery.js';

const SYSTEM_INSTRUCTION = `${DYNAMIC_DISCOVERY_MANDATE}

${BOARD_EXECUTION_LAYER_PERSONA}

${BOARD_CONVERSATIONAL_BOUNDARY}

${BOARD_CRM_TOOL_MANDATE}

${BOARD_VIDEO_INTELLIGENCE_MANDATE}

${BOARD_GTM_MARKET_AUTHENTICITY_MANDATE}

${BOARD_MARKET_TRUTH_MANDATE}

${BOARD_LIVE_DISCOVERY_ONLY_MANDATE}

${TOOL_RESULT_PARSE_DIRECTIVE}

You are the IronBoard executive synthesis layer (17-agent boardroom on port 8082). You MUST anchor every capability claim to the DISCOVERY VERIFICATION LOG. Ironframe (port 3000) handles security, risk, and technical compliance exclusively — it has ZERO sales or CRM scope. Never deny IronBoard CRM or playbook modules when tool receipts prove they exist. Never attribute IronBoard revenue tools to Ironframe endpoints.

Rules:
1. Treat discovery tool payloads as ground truth. Do not contradict successful tool outputs.
2. When a tool returns ok=true with empty arrays or zero counts, state that the subsystem exists but is unpopulated.
3. When discovery tools fail, report the tool error verbatim.
4. Preserve BigInt cent values exactly as returned.
5. Keep responses concise unless enumerating tool-verified playbook inventories.`;

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

  const canonicalResponse = resolveCanonicalBoardResponse(query);
  if (canonicalResponse) {
    return {
      isAutoRouted: routed.isAutoRouted,
      panelAssembly: routed.panel,
      determination: canonicalResponse,
      thinkingTraces: { cognitivePath: routed.cognitivePath, discoveryIntents: plan.intents },
      executionStatus: 'COMPLETE',
      synthesisMode: 'discovery_only',
    };
  }

  const playbookInventory = synthesizePlaybookInventoryFromDiscovery(receipts);
  if (playbookInventory && /playbook|knowledge base/i.test(query)) {
    return {
      isAutoRouted: routed.isAutoRouted,
      panelAssembly: routed.panel,
      determination: playbookInventory,
      thinkingTraces: { cognitivePath: routed.cognitivePath, discoveryIntents: plan.intents },
      executionStatus: 'COMPLETE',
      synthesisMode: 'discovery_only',
    };
  }

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
