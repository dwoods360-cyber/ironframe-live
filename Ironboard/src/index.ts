/**
 * IronBoard — single-file Express server
 * 17-agent boardroom · docs federation · Gemini SSE @ T=0.0
 */
import express from 'express';
import fs from 'fs';
import path from 'path';
import readline from 'node:readline';
import { fileURLToPath } from 'url';
import { GoogleGenAI, FunctionCallingConfigMode, type FunctionCall, type GroundingMetadata } from '@google/genai';
import { classifyGeminiStreamFault, withGeminiRateLimitRetry } from './lib/geminiRetry.js';
import { buildIronboardReadiness } from './lib/geminiCredentialHealth.js';
import { loadIronboardEnv, getIronboardApiKey, getIronboardGeminiModel } from './loadIronboardEnv.js';
import {
  AGENTIC_BOARD_ROSTER,
  BOARDROOM_ISOLATED_AGENT_IDS,
  BOARDROOM_ISOLATED_AGENT_REDIRECTS,
  BOARDROOM_QUERY_ROSTER,
  buildBoardroomRosterDisplayEntries,
  PRODUCT_MATRIX,
  SOVEREIGN_POOL_BASELINES_CENTS,
  buildStaticContextBundle,
  WORKFORCE_VS_SIMULATION_DISAMBIGUATION,
  type BoardPersona,
} from './staticContext.js';
import { buildProductMatrixHealthSnapshot } from './services/productMatrixHealth.js';
import { DYNAMIC_DISCOVERY_MANDATE } from './boardRouter.js';
import {
  BOARD_CONVERSATIONAL_BOUNDARY,
  BOARD_CRM_TOOL_MANDATE,
  BOARD_VIDEO_INTELLIGENCE_MANDATE,
  isBoardroomConversationPlane,
  isPlaybookInventoryQuery,
  resolveCanonicalBoardResponse,
  routeExecutivePanel,
} from './boardRouter.js';
import {
  buildCrmDiscoveryEnrichment,
  buildMarketAuthenticityEnrichment,
  formatDiscoveryEvidence,
  runDynamicDiscovery,
  summarizeEmptyDiscoveryStates,
  synthesizeCrmCapabilityFromDiscovery,
  synthesizeMarketResearchBoardResponse,
  synthesizePlaybookInventoryFromDiscovery,
  type DiscoveryReceipt,
} from './services/dynamicDiscovery.js';
import {
  fetchProspectingBatch,
  fetchProspectingBatchForTargets,
  generateGroundedPitch,
  harvestInteractionSignal,
  listProspects,
  listProspectsInRegions,
  findProspectByDomain,
  triggerProspectIngest,
  buildFlywheelWorkspaceContext,
} from './services/marketIntelligence.js';
import { verifyAndOptimizeMarketData, type VerifyAndOptimizeMarketDataResult } from './services/marketProspectAuthenticity.js';
import { parseTargetCountriesInput, resolveFlywheelTargetRegions } from './lib/flywheelTargetCountries.js';
import {
  QUERY_LOCAL_WORKSPACE_DECLARATION,
  queryLocalWorkspace,
} from './services/queryLocalWorkspace.js';
import {
  buildBoardroomTools,
  type BoardroomToolMode,
} from './services/boardroomTools.js';
import { executeBoardroomTool, isBoardroomToolName } from './services/boardroomToolHandlers.js';
import {
  inferRegionsFromQuery,
  isCompetitivePositioningQuery,
  isGtmMarketQuery,
  isMarketResearchCapabilityQuery,
  requiresCrmDiscovery,
  requiresWorkspaceTools,
  shouldPrefetchGrcEnvironment,
  shouldPrefetchProspects,
  shouldPrefetchWeb,
} from './services/boardroomQueryIntent.js';
import {
  discoverGrcEnvironmentIntel,
  formatGrcEnvironmentEnrichment,
} from './services/discoverGrcEnvironmentIntel.js';
import {
  formatMarketEntryReadinessEnrichment,
  parseMarketEntryReadinessFromTelemetry,
} from './services/marketEntryReadinessEnrichment.js';
import { findLatestRegulatoryCatalystForDomain } from './services/regulatoryCatalystLookup.js';
import { handleVideoIngress } from './api/ingress/video.js';
import { handleResendWebhookIngress } from './api/ingress/email.js';
import { interceptBoardroomLinkPayload } from './middleware/linkScraper.js';
import { createGovernanceFrameRouter } from './governanceFrame/router.js';
import { scanPublishedBriefings } from './governanceFrame/briefingScanner.js';
import { resolveDocsRoot } from './governanceFrame/resolveDocsRoot.js';
import { prefetchCorporateDocsForBoardQuery } from './services/ingress/docsBoardPrefetch.js';
import { prefetchVideoIntelligenceForBoardQuery } from './services/ingress/videoBoardPrefetch.js';
import { requiresCorporateDocsPrefetch } from './services/ingress/docsQueryIntent.js';
import { requiresVideoIntelligencePrefetch } from './services/ingress/videoQueryIntent.js';
import { buildBoardroomSystemInstruction, resolveVideoTimelineActiveFromPayload } from './services/boardroomSystemPrompt.js';
import {
  CORE_TELEMETRY_DISCONNECTED,
  fetchIronframeSharedContext,
} from './services/coreTelemetryBridge.js';
import { runDocumentationAuthoringPipeline } from './services/documentationPipeline.js';
import {
  buildToolExecutionDirective,
  prependVideoIntelligenceSystemOverride,
  stripCapabilityDenialFallbacks,
  finalizeSanitizedBoardCompletion,
  TOOL_RESULT_PARSE_DIRECTIVE,
} from './services/boardResponseLibrary.js';

const PORT = Number(process.env.PORT) || 8082;

/** Open boardroom SSE streams — must be ended on shutdown or Ctrl+C hangs on Windows. */
const activeSseClients = new Set<express.Response>();
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const IRONBOARD_ROOT = path.resolve(MODULE_DIR, '..');

const TOOL_EXECUTION_DIRECTIVE_BASE =
  `${DYNAMIC_DISCOVERY_MANDATE}\n\n` +
  `${BOARD_CONVERSATIONAL_BOUNDARY}\n\n` +
  `${BOARD_CRM_TOOL_MANDATE}\n\n` +
  `${BOARD_VIDEO_INTELLIGENCE_MANDATE}`;

function composeToolExecutionDirective(videoTimelineActive: boolean): string {
  return `${TOOL_EXECUTION_DIRECTIVE_BASE}\n\n${buildToolExecutionDirective(videoTimelineActive)}`;
}

const BOARDROOM_DIRECTIVE =
  'You are an active, data-driven member of a 17-agent corporate Board of Directors operating under the Ironframe Constitution. When asked for target clients, prospects, or market opportunities, you MUST cite ONLY company names returned in the WORKSPACE DATABASE SNAPSHOT from live discoverRegionalProspects ingestion in this session — never from static docs, playbooks, or model memory. Execute verifyAndOptimizeMarketData when the snapshot is empty. Never cite Medshield, Vaultbank, or Gridcore (SYNTHETIC_DEMO_SEED fixtures). CRITICAL: Kimbot is Simulation Bot B (red-team antagonist), NOT Agent 17. Ironbloom is Agent 17 (sustainability).';

const VALID_AGENT_IDS = new Set(BOARDROOM_QUERY_ROSTER.map(a => a.id));
const AUTO_ROUTER_ID = 'auto';

// ─── Environment ───────────────────────────────────────────────────────────────
loadIronboardEnv();

void import('./services/crm/strategicIntelIngress.js')
  .then(({ ingestGrcProfessionalResearchCorpus }) => ingestGrcProfessionalResearchCorpus())
  .then(result => {
    if (result.skippedDuplicate) {
      console.log(`[IRONBOARD] Strategic Intel manifest already ingested (${result.manifestId}).`);
    } else {
      console.log(`[IRONBOARD] Strategic Intel manifest ingested (${result.manifestId}).`);
    }
  })
  .catch(err => {
    console.warn('[IRONBOARD] Strategic Intel ingress skipped:', err instanceof Error ? err.message : err);
  });

void import('./services/crm/docsMatrixIngress.js')
  .then(({ ingestCorporateDocumentationMatrix }) => ingestCorporateDocumentationMatrix())
  .then(result => {
    console.log(
      `[IRONBOARD] Docs matrix ingested docsIngestedUnits=${result.docsIngestedUnits.toString()} skipped=${result.docsSkippedDuplicateUnits.toString()} traceId=${result.traceId}`,
    );
  })
  .catch(err => {
    console.warn('[IRONBOARD] Docs matrix ingress skipped:', err instanceof Error ? err.message : err);
  });

if (!process.env.GOOGLE_API_KEY && !getIronboardApiKey()) {
  console.warn('[IRONBOARD] GOOGLE_API_KEY is not set.');
} else {
  console.log('[IRONBOARD] GOOGLE_API_KEY present.');
}

// ─── Markdown docs federation ──────────────────────────────────────────────────
function readDoc(filePath: string): string {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
  } catch {
    return '';
  }
}

function buildDocsFederationMatrix(): string {
  const docsRoot = resolveDocsRoot();
  console.log('[IRONBOARD DOCS] Scanning', docsRoot);

  const tas = readDoc(path.join(docsRoot, 'TAS.md'));
  const trd = readDoc(path.join(docsRoot, 'stakeholders', 'technical-requirements.md'));
  const hub = readDoc(path.join(docsRoot, 'hub.md'));
  const monetizationBlueprint = readDoc(
    path.join(docsRoot, 'stakeholder-deck', 'ironframe-monetization-market-blueprint-2026-q2.md'),
  );
  const marketingLibrary = readDoc(
    path.join(docsRoot, 'marketing-strategy', 'marketing-strategy-library.md'),
  );
  const storybrandFramework = readDoc(
    path.join(docsRoot, 'marketing-strategy', 'storybrand-framework.md'),
  );
  const customerSuccessLibrary = readDoc(
    path.join(docsRoot, 'customer-success', 'customer-success-library.md'),
  );
  const pricingPackaging = readDoc(
    path.join(docsRoot, 'sales-enablement', 'pricing-and-packaging.md'),
  );
  const competitivePricingMap = readDoc(
    path.join(docsRoot, 'sales-enablement', 'competitive-pricing-map.md'),
  );
  const loaded = [
    tas,
    trd,
    hub,
    monetizationBlueprint,
    marketingLibrary,
    storybrandFramework,
    customerSuccessLibrary,
    pricingPackaging,
    competitivePricingMap,
  ].filter(Boolean).length;
  console.log(`[IRONBOARD DOCS] Loaded ${loaded} markdown file(s).`);

  return [
    '═══ LOCAL DOCUMENTATION FEDERATION (READ-ONLY) ═══',
    tas ? `\n── TAS.md ──\n${tas}` : '',
    trd ? `\n── technical-requirements.md ──\n${trd}` : '',
    hub ? `\n── hub.md ──\n${hub}` : '',
    monetizationBlueprint
      ? `\n── MONETIZATION & MARKET BLUEPRINT (Q2 2026 — BOARD PRIORITY) ──\n${monetizationBlueprint}`
      : '',
    pricingPackaging
      ? `\n── PRICING & PACKAGING (SALES-ENABLEMENT) ──\n${pricingPackaging}`
      : '',
    competitivePricingMap
      ? `\n── COMPETITIVE PRICING MAP (SALES-ENABLEMENT) ──\n${competitivePricingMap}`
      : '',
    marketingLibrary
      ? `\n── MARKETING STRATEGY LIBRARY (GTM + STORYBRAND) ──\n${marketingLibrary}`
      : '',
    storybrandFramework
      ? `\n── STORYBRAND FRAMEWORK (SB7 + BRANDSCRIPT) ──\n${storybrandFramework}`
      : '',
    customerSuccessLibrary
      ? `\n── CUSTOMER SUCCESS LIBRARY (RETENTION + EXPANSION) ──\n${customerSuccessLibrary}`
      : '',
    '═══ END FEDERATION ═══',
  ].join('\n');
}

const DOCS_FEDERATION = buildDocsFederationMatrix();
const STATIC_CONTEXT = buildStaticContextBundle();

// ─── 17-agent boardroom routing ────────────────────────────────────────────────
function resolveAgentId(agentId: string): string | null {
  const id = agentId.trim();
  if (BOARDROOM_ISOLATED_AGENT_IDS.has(id)) return null;
  if (id === AUTO_ROUTER_ID) return AUTO_ROUTER_ID;
  if (VALID_AGENT_IDS.has(id)) return id;
  return null;
}

function buildSystemInstruction(
  leader: BoardPersona,
  flywheelContext: string | null | undefined,
  history: HistoryTurn[],
  query: string,
  linkScraperEnrichment: string,
  requestBody: unknown,
  liveSystemTelemetryJson: string,
): string {
  return buildBoardroomSystemInstruction({
    leader,
    staticContext: STATIC_CONTEXT,
    docsFederation: DOCS_FEDERATION,
    boardroomDirective: BOARDROOM_DIRECTIVE,
    workforceDisambiguation: WORKFORCE_VS_SIMULATION_DISAMBIGUATION,
    flywheelContext,
    history,
    query,
    linkScraperEnrichment,
    requestBody,
    liveSystemTelemetryJson,
  });
}

function writeSseToken(res: express.Response, token: string, sanitizeDenials = false): void {
  const payload = sanitizeDenials ? stripCapabilityDenialFallbacks(token) : token;
  if (!payload) return;
  writeSseEvent(res, { token: payload });
}

type ClientGroundingPayload = {
  webSearchQueries: string[];
  sources: Array<{ title: string | null; uri: string | null; domain: string | null }>;
};

function writeSseEvent(res: express.Response, payload: Record<string, unknown>): void {
  if (res.writableEnded) return;
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function writeSseGrounding(res: express.Response, grounding: ClientGroundingPayload): void {
  writeSseEvent(res, { grounding });
}

function writeSseToolCall(res: express.Response, toolCall: Record<string, unknown>): void {
  writeSseEvent(res, { toolCall });
}

const MAX_TOOL_ROUNDS = 4;

type GeminiPart = Record<string, unknown>;
type GeminiContent = { role: string; parts: GeminiPart[] };

function resolveBoardroomToolMode(
  model: string,
  query: string,
  options: { hasWorkspacePrefetch?: boolean } = {},
): BoardroomToolMode {
  const needsWeb = shouldPrefetchWeb(query) && !options.hasWorkspacePrefetch;
  // Gemini 3 can combine googleSearch + functions, but forcing it on every turn
  // stalls synthesis after workspace prefetch. Prefer workspace-only when we already
  // have tool receipts; use combined only when live web grounding is still required.
  if (/gemini-3/i.test(model) && needsWeb) return 'combined';
  if (
    requiresWorkspaceTools(query) ||
    shouldPrefetchProspects(query) ||
    options.hasWorkspacePrefetch
  ) {
    return 'workspace';
  }
  if (shouldPrefetchWeb(query)) return 'web';
  return 'workspace';
}

/** Soft ceiling so a stuck Gemini stream cannot leave the boardroom UI on Streaming… forever. */
const BOARDROOM_STREAM_ROUND_TIMEOUT_MS = 55_000;
const BOARDROOM_WEB_PREFETCH_TIMEOUT_MS = 25_000;
const BOARDROOM_GRC_PREFETCH_TIMEOUT_MS = 25_000;

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function buildBoardroomStreamConfig(
  model: string,
  systemInstruction: string,
  toolMode: BoardroomToolMode,
  videoTimelineActive: boolean,
): Record<string, unknown> {
  // Gemini 3 combined (googleSearch + functionDeclarations) requires tool-context
  // circulation; AUTO mode is rejected when includeServerSideToolInvocations is set.
  const toolConfig: Record<string, unknown> =
    toolMode === 'combined'
      ? {
          includeServerSideToolInvocations: true,
          functionCallingConfig: { mode: FunctionCallingConfigMode.VALIDATED },
        }
      : toolMode === 'workspace'
        ? { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } }
        : {};

  const config: Record<string, unknown> = {
    systemInstruction: prependVideoIntelligenceSystemOverride(
      [systemInstruction, composeToolExecutionDirective(videoTimelineActive)]
        .filter(Boolean)
        .join('\n\n'),
      videoTimelineActive,
    ),
    temperature: 0,
    topP: 0,
    tools: buildBoardroomTools(model, toolMode),
  };
  if (Object.keys(toolConfig).length) {
    config.toolConfig = toolConfig;
  }
  return config;
}

function buildSyntheticToolExchange(
  toolResult: Record<string, unknown>,
  args: Record<string, unknown>,
): GeminiContent[] {
  const callId = `prefetch-${Date.now()}`;
  return [
    {
      role: 'model',
      parts: [{ functionCall: { name: 'queryLocalWorkspace', id: callId, args } }],
    },
    {
      role: 'user',
      parts: [
        { functionResponse: { name: 'queryLocalWorkspace', id: callId, response: toolResult } },
        { text: TOOL_RESULT_PARSE_DIRECTIVE },
      ],
    },
  ];
}

async function prefetchWebGrounding(
  ai: GoogleGenAI,
  model: string,
  query: string,
): Promise<{ enrichment: string; grounding: GroundingMetadata | null }> {
  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Board intelligence request — answer using live web search:\n${query}\n\nRetrieve current factual information worldwide (local time, news, regulations, market data, geography, events). Cite sources when available.`,
              },
            ],
          },
        ],
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0,
          topP: 0,
        },
      }),
      BOARDROOM_WEB_PREFETCH_TIMEOUT_MS,
      'web-prefetch',
    );
    const grounding = response.candidates?.[0]?.groundingMetadata ?? null;
    const text = response.text?.trim() ?? '';
    const enrichment = text
      ? [
          'LIVE WEB GROUND TRUTH (Google Search prefetch — cite in your answer):',
          text.slice(0, 4500),
          grounding?.webSearchQueries?.length
            ? `Search queries executed: ${grounding.webSearchQueries.join('; ')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n')
      : '';
    return { enrichment, grounding };
  } catch (err) {
    console.warn('[IRONBOARD WEB PREFETCH]', err);
    return { enrichment: '', grounding: null };
  }
}

async function prefetchBoardroomGroundTruth(params: {
  ai: GoogleGenAI;
  model: string;
  query: string;
  activeHub: string;
  tenantId?: string;
  prospectId?: string;
  res: express.Response;
  linkScraperEnrichment?: string;
}): Promise<{
  prefetchedExchange: GeminiContent[];
  systemEnrichment: string;
  receipts: DiscoveryReceipt[];
  marketResults: VerifyAndOptimizeMarketDataResult[];
  workspaceSnapshot?: Record<string, unknown>;
}> {
  const { ai, model, query, activeHub, tenantId, prospectId, res, linkScraperEnrichment } = params;
  const prefetchedExchange: GeminiContent[] = [];
  const enrichmentBlocks: string[] = [];
  const marketResults: VerifyAndOptimizeMarketDataResult[] = [];
  let workspaceSnapshot: Record<string, unknown> | undefined;

  const { receipts } = await runDynamicDiscovery(query, {
    tenantId,
    activeHub,
    prospectId,
  });

  for (const receipt of receipts) {
    const queryType = receipt.args.queryType ?? receipt.args.action ?? null;
    writeSseToolCall(res, {
      name: receipt.tool,
      status: 'running',
      queryType,
      prefetch: true,
    });
    writeSseToolCall(res, {
      name: receipt.tool,
      status: 'complete',
      queryType,
      ok: receipt.ok,
      prefetch: true,
    });
    prefetchedExchange.push(...buildSyntheticToolExchange(receipt.payload, receipt.args));
  }

  enrichmentBlocks.push(
    `DYNAMIC DISCOVERY VERIFICATION LOG (mandatory ground truth — do not use static capability prose):\n${formatDiscoveryEvidence(receipts)}`,
  );

  const emptyStates = summarizeEmptyDiscoveryStates(receipts);
  if (emptyStates.length) {
    enrichmentBlocks.push(
      `EMPTY STATE INTERPRETATION (feature exists; data unpopulated):\n${emptyStates.join('\n')}`,
    );
  }

  const crmEnrichment = buildCrmDiscoveryEnrichment(receipts);
  if (crmEnrichment) enrichmentBlocks.push(crmEnrichment);

  if (shouldPrefetchProspects(query)) {
    const inferred = inferRegionsFromQuery(query, activeHub);
    const regions = inferred.length > 0 ? inferred : resolveFlywheelTargetRegions(activeHub);
    for (const region of regions) {
      try {
        const result = await verifyAndOptimizeMarketData(region, { operatorTriggered: true });
        marketResults.push(result);
      } catch (err) {
        console.warn('[IRONBOARD MARKET AUTHENTICITY]', region, err);
      }
    }
    const marketEnrichment = buildMarketAuthenticityEnrichment(marketResults);
    if (marketEnrichment) enrichmentBlocks.push(marketEnrichment);
    const args: Record<string, unknown> = {
      queryType: 'active_prospects',
      limit: 20,
      ...(regions.length === 1 ? { region: regions[0] } : {}),
      ...(regions.length > 1 ? { regions } : {}),
    };
    writeSseToolCall(res, {
      name: 'queryLocalWorkspace',
      status: 'running',
      queryType: 'active_prospects',
      region: regions[0] ?? null,
      regions: regions.length > 1 ? regions : null,
      prefetch: true,
    });
    const toolResult = await queryLocalWorkspace(args);
    workspaceSnapshot = toolResult;
    writeSseToolCall(res, {
      name: 'queryLocalWorkspace',
      status: 'complete',
      queryType: 'active_prospects',
      region: regions[0] ?? null,
      regions: regions.length > 1 ? regions : null,
      ok: toolResult.ok === true,
      prefetch: true,
    });
    prefetchedExchange.push(...buildSyntheticToolExchange(toolResult, args));
    enrichmentBlocks.push(
      `WORKSPACE DATABASE SNAPSHOT (authoritative — do not claim tools are unavailable):\n${JSON.stringify(toolResult)}`,
    );

    const prospectRows = Array.isArray(toolResult.prospects)
      ? (toolResult.prospects as Array<{ domain?: string }>)
      : [];
    const catalystLines: string[] = [];
    for (const row of prospectRows.slice(0, 5)) {
      const domain = String(row.domain ?? '').trim();
      if (!domain) continue;
      const catalyst = await findLatestRegulatoryCatalystForDomain(domain);
      if (catalyst) {
        catalystLines.push(
          `- ${catalyst.prospectDomain}: [${catalyst.authority}] ${catalyst.title} — ${catalyst.whyNow} (${catalyst.sourceUrl})`,
        );
      }
    }
    if (catalystLines.length) {
      enrichmentBlocks.push(
        `INDUSTRY SCOUT REGULATORY CATALYSTS (CRM — cite sourceUrl):\n${catalystLines.join('\n')}`,
      );
    }
  }

  if (shouldPrefetchGrcEnvironment(query)) {
    const grcRegions = inferRegionsFromQuery(query, activeHub);
    const grcTargets = grcRegions.length > 0 ? grcRegions : resolveFlywheelTargetRegions(activeHub);
    // Cap regions so a bad hub string cannot enqueue unbounded Google Search calls.
    for (const region of grcTargets.slice(0, 2)) {
      try {
        const grcResult = await withTimeout(
          discoverGrcEnvironmentIntel(region),
          BOARDROOM_GRC_PREFETCH_TIMEOUT_MS,
          `grc-environment-${region}`,
        );
        const grcEnrichment = formatGrcEnvironmentEnrichment(grcResult);
        if (grcEnrichment) enrichmentBlocks.push(grcEnrichment);
      } catch (err) {
        console.warn('[IRONBOARD GRC ENVIRONMENT]', region, err);
      }
    }
  }

  if (shouldPrefetchWeb(query)) {
    const web = await prefetchWebGrounding(ai, model, query);
    if (web.grounding) {
      const clientGrounding = serializeGroundingForClient(web.grounding);
      if (clientGrounding) writeSseGrounding(res, clientGrounding);
    }
    if (web.enrichment) enrichmentBlocks.push(web.enrichment);
  }

  if (requiresCorporateDocsPrefetch(query)) {
    writeSseToolCall(res, {
      name: 'boardKnowledgeDocs',
      status: 'running',
      prefetch: true,
    });
    const docs = await prefetchCorporateDocsForBoardQuery(query, tenantId);
    writeSseToolCall(res, {
      name: 'boardKnowledgeDocs',
      status: 'complete',
      ok: docs.ok,
      prefetch: true,
      docsMatchedUnits: docs.docsMatchedUnits.toString(),
    });
    if (docs.enrichment) enrichmentBlocks.push(docs.enrichment);
  }

  if (linkScraperEnrichment) {
    enrichmentBlocks.push(linkScraperEnrichment);
  }
  if (requiresVideoIntelligencePrefetch(query) && !(linkScraperEnrichment ?? '').includes('VIDEO INTELLIGENCE')) {
    writeSseToolCall(res, {
      name: 'videoIntelligenceIngress',
      status: 'running',
      prefetch: true,
    });
    const video = await prefetchVideoIntelligenceForBoardQuery(query, tenantId);
    writeSseToolCall(res, {
      name: 'videoIntelligenceIngress',
      status: 'complete',
      ok: video.ok,
      prefetch: true,
      blockCount: video.parsed?.metadata.blockCount ?? 0,
    });
    if (video.enrichment) enrichmentBlocks.push(video.enrichment);
  }

  return {
    prefetchedExchange,
    systemEnrichment: enrichmentBlocks.join('\n\n'),
    receipts,
    marketResults,
    workspaceSnapshot,
  };
}

function serializeGroundingForClient(meta: GroundingMetadata | null): ClientGroundingPayload | null {
  if (!meta) return null;
  const sources = (meta.groundingChunks ?? [])
    .map(chunk => ({
      title: chunk.web?.title ?? chunk.retrievedContext?.title ?? null,
      uri: chunk.web?.uri ?? chunk.retrievedContext?.uri ?? null,
      domain: chunk.web?.domain ?? null,
    }))
    .filter(source => source.title || source.uri);
  return {
    webSearchQueries: meta.webSearchQueries ?? [],
    sources,
  };
}

function mergeGroundingMetadata(
  existing: GroundingMetadata | null,
  incoming: GroundingMetadata,
): GroundingMetadata {
  if (!existing) return incoming;
  const querySet = new Set([...(existing.webSearchQueries ?? []), ...(incoming.webSearchQueries ?? [])]);
  const chunkKeys = new Set<string>();
  const groundingChunks = [...(existing.groundingChunks ?? []), ...(incoming.groundingChunks ?? [])].filter(
    chunk => {
      const key = chunk.web?.uri ?? chunk.retrievedContext?.uri ?? JSON.stringify(chunk);
      if (chunkKeys.has(key)) return false;
      chunkKeys.add(key);
      return true;
    },
  );
  return {
    ...existing,
    ...incoming,
    webSearchQueries: [...querySet],
    groundingChunks,
  };
}

async function streamBoardroomGeminiRound(params: {
  ai: GoogleGenAI;
  res: express.Response;
  abort: { closed: boolean };
  model: string;
  contents: GeminiContent[];
  config: Record<string, unknown>;
  emitTokens: boolean;
  sanitizeDenials: boolean;
}): Promise<{
  accumulatedText: string;
  functionCalls: FunctionCall[] | undefined;
  grounding: GroundingMetadata | null;
}> {
  const { ai, res, abort, model, contents, config, emitTokens, sanitizeDenials } = params;
  let accumulatedText = '';
  let functionCalls: FunctionCall[] | undefined;
  let grounding: GroundingMetadata | null = null;

  const stream = await withGeminiRateLimitRetry(
    () =>
      ai.models.generateContentStream({
        model,
        contents,
        config,
      }),
    { label: 'boardroom-stream', maxAttempts: 4 },
  );

  const deadline = Date.now() + BOARDROOM_STREAM_ROUND_TIMEOUT_MS;
  for await (const chunk of stream) {
    if (abort.closed || res.writableEnded) break;
    if (Date.now() > deadline) {
      throw new Error(
        `boardroom-stream round timed out after ${BOARDROOM_STREAM_ROUND_TIMEOUT_MS}ms`,
      );
    }

    const chunkText = chunk.text ?? '';
    if (chunkText) {
      accumulatedText += chunkText;
      if (emitTokens) writeSseToken(res, chunkText, sanitizeDenials);
    }

    const chunkGrounding = chunk.candidates?.[0]?.groundingMetadata;
    if (chunkGrounding) {
      grounding = mergeGroundingMetadata(grounding, chunkGrounding);
      const clientGrounding = serializeGroundingForClient(grounding);
      if (clientGrounding) writeSseGrounding(res, clientGrounding);
    }

    const chunkCalls = chunk.functionCalls;
    if (chunkCalls?.length) functionCalls = chunkCalls;
  }

  return { accumulatedText, functionCalls, grounding };
}

async function resolveBoardroomToolCall(
  res: express.Response,
  call: FunctionCall,
): Promise<GeminiPart> {
  const args = (call.args ?? {}) as Record<string, unknown>;
  writeSseToolCall(res, {
    name: call.name,
    status: 'running',
    queryType: args.queryType ?? args.action ?? null,
  });

  let toolResult: Record<string, unknown>;
  try {
    toolResult = await executeBoardroomTool(call.name, args);
  } catch (err) {
    toolResult = {
      ok: false,
      error: err instanceof Error ? err.message : 'Boardroom tool failed',
    };
  }

  writeSseToolCall(res, {
    name: call.name,
    status: 'complete',
    queryType: args.queryType ?? args.action ?? null,
    ok: toolResult.ok === true,
  });

  return {
    functionResponse: {
      name: call.name,
      id: call.id,
      response: toolResult,
    },
  };
}

async function runBoardroomToolStream(params: {
  ai: GoogleGenAI;
  res: express.Response;
  abort: { closed: boolean };
  model: string;
  history: HistoryTurn[];
  config: Record<string, unknown>;
  prefetchedExchange?: GeminiContent[];
  sanitizeDenials?: boolean;
  gtmMarketQuery?: boolean;
  competitivePositioningQuery?: boolean;
}): Promise<void> {
  const {
    ai,
    res,
    abort,
    model,
    history,
    config,
    prefetchedExchange = [],
    sanitizeDenials = false,
    gtmMarketQuery = false,
    competitivePositioningQuery = false,
  } = params;
  let contents: GeminiContent[] = [...mapHistoryToGeminiContents(history), ...prefetchedExchange];
  const skipFirstRoundTokens = prefetchedExchange.length > 0;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const emitTokens = round > 0 || skipFirstRoundTokens;

    const { accumulatedText, functionCalls } = await streamBoardroomGeminiRound({
      ai,
      res,
      abort,
      model,
      contents,
      config,
      emitTokens,
      sanitizeDenials,
    });

    if (abort.closed || res.writableEnded) return;

    if (!functionCalls?.length) {
      const { text: finalText, rewritten } = finalizeSanitizedBoardCompletion(
        accumulatedText,
        sanitizeDenials,
        { query: lastUserTurnText(history), gtmMarketQuery, competitivePositioningQuery },
      );
      if (finalText && !emitTokens) {
        writeSseToken(res, finalText, false);
      } else if (finalText && emitTokens && rewritten) {
        writeSseEvent(res, { streamFlush: true });
        writeSseToken(res, finalText, false);
      }
      return;
    }

    // Tool round: discard streamed preamble; persist model function calls before resolving tools.
    const modelParts: GeminiPart[] = functionCalls.map(call => ({ functionCall: call }));
    contents.push({ role: 'model', parts: modelParts });

    const boardroomCalls = functionCalls.filter(call => isBoardroomToolName(call.name));
    const responseParts: GeminiPart[] = [];
    for (const call of boardroomCalls) {
      responseParts.push(await resolveBoardroomToolCall(res, call));
    }

    if (!responseParts.length) return;

    responseParts.push({ text: TOOL_RESULT_PARSE_DIRECTIVE });
    contents.push({ role: 'user', parts: responseParts });
    // Clear client-side tool-stream scratch before the final synthesis pass streams tokens.
    writeSseEvent(res, { streamFlush: true });
  }
}

type HistoryTurn = { role: 'user' | 'model'; text: string };

function normalizeHistory(raw: unknown): HistoryTurn[] {
  if (!Array.isArray(raw)) return [];
  const out: HistoryTurn[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const record = item as { role?: string; text?: string; content?: string };
    const role: 'user' | 'model' = record.role === 'model' ? 'model' : 'user';
    const text = String(record.text ?? record.content ?? '').trim();
    if (!text) continue;
    out.push({ role, text });
  }
  return out;
}

function mapHistoryToGeminiContents(history: HistoryTurn[]) {
  return history.map(turn => ({
    role: turn.role,
    parts: [{ text: turn.text }],
  }));
}

function lastUserTurnText(history: HistoryTurn[]): string {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'user') return history[i].text;
  }
  return history[0]?.text ?? '';
}

// ─── Dashboard HTML ────────────────────────────────────────────────────────────
function renderDashboard(): string {
  const rosterButtons = buildBoardroomRosterDisplayEntries()
    .map((a) => {
      const isolatedAttrs = a.isolated
        ? ` class="roster-btn roster-isolated" data-isolated="true" data-ironframe-route="${a.ironframeRoute ?? ''}"`
        : ` class="roster-btn"`;
      const teamLine = a.isolated
        ? `<span class="team">${a.team} · app docs on Ironframe :3000</span>`
        : `<span class="team">${a.team}</span>`;
      return `<button type="button"${isolatedAttrs} data-id="${a.id}" data-role="${a.role.replace(/"/g, '&quot;')}">
      <span class="role">${a.role}</span>${teamLine}
    </button>`;
    })
    .join('');

  const fleetPanelRows = PRODUCT_MATRIX.map(
    (entry) => `<div class="product product-matrix-row workforce-app" data-matrix-key="${entry.key}" title="${entry.ingressNote ?? ''}">
      <div class="fleet-row-header">
        <span class="product-main">
          <span class="status-dot status-unknown" data-status-dot aria-hidden="true"></span>
          <strong>${entry.name}</strong>
          <span class="product-meta">:${entry.port}</span>
        </span>
        <span class="product-meta">${entry.priority}</span>
      </div>
      <div class="fleet-row-role">${entry.role}</div>
      ${entry.crmStage ? `<div class="fleet-row-crm">CRM · ${entry.crmStage}</div>` : ''}
    </div>`,
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Cache-Control" content="no-cache, must-revalidate">
  <title>IronBoard // 17-Agent Boardroom</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    body { font-family: ui-monospace, monospace; background: #020617; color: #e2e8f0; height: 100vh; max-height: 100vh; overflow: hidden; display: flex; flex-direction: column; }
    header { flex-shrink: 0; padding: 1rem 1.5rem; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
    header h1 { font-size: 0.85rem; letter-spacing: 0.15em; text-transform: uppercase; color: #fbbf24; }
    .voice-controls { display: flex; align-items: center; gap: 1rem; background: #0f172a; border: 1px solid #334155; border-radius: 0.35rem; padding: 0.35rem 0.75rem; }
    .voice-controls label { font-size: 0.6rem; font-weight: 800; text-transform: uppercase; color: #94a3b8; }
    .voice-controls .slider-row { display: flex; align-items: center; gap: 0.35rem; }
    .voice-controls input[type=range] { width: 4rem; accent-color: #f59e0b; cursor: pointer; }
    .voice-controls .val { font-size: 0.6rem; font-weight: 700; color: #fbbf24; min-width: 2rem; }
    header span { font-size: 0.65rem; color: #64748b; white-space: nowrap; }
    main { flex: 1 1 auto; display: grid; grid-template-columns: 32vw 1fr 22vw; min-height: 0; overflow: hidden; }
    section { border-right: 1px solid #1e293b; overflow-y: auto; overflow-x: hidden; padding: 1rem; min-height: 0; overscroll-behavior: contain; }
    section:last-child { border-right: none; border-left: 1px solid #1e293b; }
    #left-panel { display: flex; flex-direction: column; gap: 1rem; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
    #market-flywheel { border-top: 1px solid #1e293b; padding-top: 0.75rem; flex-shrink: 0; }
    #market-flywheel h2 { font-size: 0.62rem; letter-spacing: 0.08em; text-transform: uppercase; color: #34d399; margin-bottom: 0.5rem; line-height: 1.4; }
    .target-countries-label { display: block; font-size: 0.58rem; font-weight: 800; text-transform: uppercase; color: #94a3b8; margin-bottom: 0.25rem; }
    #target-countries-input { width: 100%; margin-bottom: 0.35rem; padding: 0.45rem 0.5rem; font-size: 0.62rem; background: #0f172a; border: 1px solid #334155; border-radius: 0.35rem; color: #e2e8f0; font-family: inherit; }
    .target-countries-hint { font-size: 0.56rem; color: #64748b; margin-bottom: 0.5rem; line-height: 1.35; }
    .target-countries-payload { color: #34d399; font-weight: 700; }
    #fetch-batch-btn { width: 100%; margin-bottom: 0.5rem; padding: 0.45rem; font-size: 0.62rem; font-weight: 800; text-transform: uppercase; background: #065f46; color: #ecfdf5; border: 1px solid #34d399; border-radius: 0.35rem; cursor: pointer; }
    #fetch-batch-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    #prospect-list { max-height: 11rem; overflow-y: auto; border: 1px solid #334155; border-radius: 0.35rem; background: #0f172a; margin-bottom: 0.5rem; }
    .prospect-row { display: grid; grid-template-columns: 1fr auto; gap: 0.25rem; padding: 0.45rem 0.5rem; border-bottom: 1px solid #1e293b; cursor: pointer; font-size: 0.62rem; }
    .prospect-row:last-child { border-bottom: none; }
    .prospect-row:hover { background: #1e293b; }
    .prospect-row.selected { background: #451a03; border-left: 2px solid #f59e0b; }
    .prospect-row .firm-name { font-weight: 700; color: #e2e8f0; }
    .prospect-row .firm-meta { color: #64748b; font-size: 0.58rem; margin-top: 0.15rem; }
    .prospect-row .score-pill { align-self: center; font-weight: 800; color: #34d399; background: #022c22; border: 1px solid #34d399; border-radius: 999px; padding: 0.15rem 0.45rem; white-space: nowrap; }
    .prospect-empty { padding: 0.75rem; font-size: 0.62rem; color: #64748b; text-align: center; }
    #pitch-preview-pane { width: 100%; min-height: 5.5rem; max-height: 8rem; background: #020617; border: 1px solid #334155; border-radius: 0.35rem; color: #e2e8f0; padding: 0.5rem; font-family: inherit; font-size: 0.62rem; line-height: 1.45; resize: vertical; margin-bottom: 0.5rem; }
    .harvest-actions { display: flex; gap: 0.35rem; }
    .harvest-btn { flex: 1; padding: 0.4rem; font-size: 0.58rem; font-weight: 800; text-transform: uppercase; border-radius: 0.35rem; cursor: pointer; border: 1px solid #334155; }
    #harvest-positive { background: #065f46; color: #ecfdf5; border-color: #34d399; }
    #harvest-negative { background: #450a0a; color: #fecaca; border-color: #f87171; }
    .harvest-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    #market-status { font-size: 0.58rem; color: #64748b; margin-top: 0.35rem; min-height: 0.85rem; }
    .roster-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; }
    .roster-btn { width: 100%; text-align: left; padding: 0.5rem; background: #0f172a; border: 1px solid #334155; border-radius: 0.35rem; color: #e2e8f0; cursor: pointer; }
    .roster-btn.roster-auto { grid-column: 1 / -1; }
    .roster-btn.active { border-color: #f59e0b; background: #451a03; }
    .roster-btn.roster-isolated { border-style: dashed; border-color: #6366f1; }
    .roster-btn.roster-isolated.active { border-color: #a78bfa; background: #1e1b4b; }
    .roster-btn.roster-isolated .team { color: #a78bfa; }
    .roster-btn .role { display: block; font-weight: 700; font-size: 0.68rem; line-height: 1.25; }
    .roster-btn .team { display: block; font-size: 0.6rem; color: #64748b; margin-top: 0.15rem; }
    section#chat-panel { overflow: hidden; display: flex; flex-direction: column; border-right: none; min-height: 0; max-height: 100%; padding: 1rem; overscroll-behavior: none; }
    #chat-header { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; flex-shrink: 0; }
    #active-label { font-size: 0.65rem; color: #fbbf24; flex-shrink: 0; }
    #chat-window { flex: 1 1 0; background: #0f172a; border: 1px solid #334155; border-radius: 0.35rem; padding: 0.75rem; overflow-y: auto; overflow-x: hidden; min-height: 0; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
    #chat-messages { min-height: min-content; }
    #chat-compose { flex-shrink: 0; margin-top: 0.75rem; }
    .chat-scroll-anchor { height: 0; width: 100%; overflow: hidden; pointer-events: none; flex-shrink: 0; }
    .msg-user, .msg-model { padding: 0.65rem; margin-bottom: 0.5rem; border-radius: 0.35rem; white-space: pre-wrap; font-size: 0.85rem; line-height: 1.5; }
    .msg-user { background: #1e293b; border: 1px solid #334155; color: #e2e8f0; }
    .msg-user-label { font-size: 0.6rem; color: #fbbf24; font-weight: 800; text-transform: uppercase; margin-bottom: 0.25rem; }
    .msg-model { background: #020617; border: 1px solid #334155; border-left: 3px solid #f59e0b; color: #e2e8f0; }
    .msg-model-label { font-size: 0.6rem; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 0.25rem; }
    .msg-streaming { border-left-color: #fbbf24; }
    .grounding-panel { margin-top: 0.5rem; padding: 0.5rem 0.6rem; background: #0f172a; border: 1px solid #334155; border-radius: 0.25rem; font-size: 0.62rem; line-height: 1.4; }
    .grounding-label { display: block; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 0.25rem; letter-spacing: 0.06em; }
    .grounding-queries { margin-bottom: 0.35rem; }
    .grounding-query { display: inline-block; margin: 0.1rem 0.25rem 0.1rem 0; padding: 0.12rem 0.4rem; background: #1e293b; border: 1px solid #334155; border-radius: 999px; color: #94a3b8; }
    .grounding-sources ul { margin: 0.2rem 0 0 1rem; padding: 0; }
    .grounding-sources li { margin-bottom: 0.15rem; }
    .grounding-sources a { color: #38bdf8; text-decoration: none; }
    .grounding-sources a:hover { text-decoration: underline; }
    .tool-call-hint { font-size: 0.58rem; color: #34d399; font-style: italic; margin-top: 0.35rem; }
    form { display: flex; gap: 0.5rem; flex-shrink: 0; }
    textarea { flex: 1; background: #0f172a; border: 1px solid #334155; border-radius: 0.35rem; color: #e2e8f0; padding: 0.65rem; resize: vertical; min-height: 2.75rem; max-height: 5.5rem; font-family: inherit; }
    button[type=submit] { background: #d97706; color: #020617; border: none; border-radius: 0.35rem; padding: 0 1.25rem; font-weight: 800; cursor: pointer; }
    button[type=submit]:disabled { opacity: 0.5; cursor: not-allowed; }
    #ptt-btn { background: #1e293b; color: #e2e8f0; border: 1px solid #334155; border-radius: 0.35rem; padding: 0 0.85rem; font-weight: 800; cursor: pointer; font-size: 0.7rem; text-transform: uppercase; flex-shrink: 0; }
    #ptt-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    #ptt-btn[data-recording="1"] { border-color: #f87171; color: #fca5a5; box-shadow: 0 0 0.45rem rgba(248, 113, 113, 0.35); }
    #status { font-size: 0.65rem; color: #fbbf24; margin-top: 0.5rem; min-height: 1rem; flex-shrink: 0; }
    .product { padding: 0.5rem; background: #0f172a; border: 1px solid #334155; border-radius: 0.35rem; margin-bottom: 0.4rem; font-size: 0.7rem; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
    .workforce-app { flex-wrap: wrap; align-items: flex-start; }
    .product-matrix-row .product-main { display: flex; align-items: center; gap: 0.4rem; min-width: 0; flex-wrap: wrap; }
    .product-matrix-row strong { font-size: 0.68rem; line-height: 1.25; }
    .fleet-row-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; width: 100%; }
    .fleet-row-role { font-size: 0.58rem; color: #64748b; margin-top: 0.2rem; line-height: 1.3; padding-left: 1.1rem; }
    .fleet-row-crm { font-size: 0.56rem; color: #475569; margin-top: 0.12rem; padding-left: 1.1rem; }
    .product-meta { font-size: 0.58rem; font-weight: 800; color: #94a3b8; white-space: nowrap; flex-shrink: 0; }
    .status-dot { width: 0.5rem; height: 0.5rem; border-radius: 50%; flex-shrink: 0; background: #64748b; }
    .status-dot.status-up { background: #34d399; box-shadow: 0 0 0.35rem #34d399; animation: matrix-pulse 2s ease-in-out infinite; }
    .status-dot.status-down { background: #f87171; box-shadow: 0 0 0.25rem #f87171; }
    .status-dot.status-unknown { background: #64748b; }
    @keyframes matrix-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
    #product-matrix-status { font-size: 0.56rem; color: #64748b; margin-bottom: 0.35rem; min-height: 0.85rem; }
    .baseline { font-size: 0.68rem; display: flex; justify-content: space-between; padding: 0.2rem 0; color: #94a3b8; }
    .baseline span:last-child { color: #34d399; }
  </style>
</head>
<body>
  <header>
    <h1>IronBoard // 17-Agent Boardroom</h1>
    <div class="voice-controls">
      <div class="slider-row">
        <label for="voice-speed-slider">Speed</label>
        <input type="range" id="voice-speed-slider" min="0.5" max="2.5" step="0.05" value="1.00" />
        <span id="speed-val-display" class="val">1.00x</span>
      </div>
      <div class="slider-row">
        <label for="voice-pitch-slider">Pitch</label>
        <input type="range" id="voice-pitch-slider" min="0.5" max="1.5" step="0.05" value="1.00" />
        <span id="pitch-val-display" class="val">1.00</span>
      </div>
    </div>
    <span>Gemini · ${getIronboardGeminiModel()} · port ${PORT}</span>
  </header>
  <main>
    <section id="left-panel">
      <div id="roster">
        <p style="font-size:0.65rem;color:#64748b;margin-bottom:0.5rem;text-transform:uppercase;">Board Roster (17)</p>
        <div class="roster-grid">
          <button type="button" class="roster-btn roster-auto active" data-id="auto" data-role="Auto-Routing">
            <span class="role">✨ Auto Panel Router</span><span class="team">Routes across 15 live chat agents</span>
          </button>
          ${rosterButtons}
        </div>
      </div>
      <div id="market-flywheel">
        <h2>📈 MARKET INTEGRATION &amp; LEAD FLYWHEEL</h2>
        <label class="target-countries-label" for="target-countries-input">Target countries</label>
        <input type="text" id="target-countries-input" placeholder="Germany, Australia, Ireland, Canada" spellcheck="false" autocomplete="off" />
        <p class="target-countries-hint">Active markets: <span id="target-countries-payload" class="target-countries-payload">—</span></p>
        <button type="button" id="fetch-batch-btn">Load Prospecting Batch</button>
        <div id="prospect-list"><div class="prospect-empty">Enter target countries and load a Fintech SaaS batch (5–50 employees).</div></div>
        <textarea id="pitch-preview-pane" readonly placeholder="Select a prospect to generate BigInt-grounded outreach copy…"></textarea>
        <div class="harvest-actions">
          <button type="button" id="harvest-positive" class="harvest-btn" disabled>Harvest Signal (+)</button>
          <button type="button" id="harvest-negative" class="harvest-btn" disabled>Harvest Signal (−)</button>
        </div>
        <div id="market-status"></div>
      </div>
    </section>
    <section id="chat-panel">
      <div id="chat-header">
        <div id="active-label">Active: Auto-Routing</div>
      </div>
      <div id="chat-window"></div>
      <div id="chat-compose">
        <form id="query-form">
          <textarea id="user-prompt" placeholder="Ask the board…" rows="2"></textarea>
          <button type="button" id="ptt-btn" title="Push-to-talk: click to record, click again to transcribe and Query. Gemini STT — no wake listening.">PTT</button>
          <button type="submit" id="submit-btn">Query</button>
        </form>
        <div id="status"></div>
      </div>
    </section>
    <section>
      <p style="font-size:0.65rem;color:#64748b;margin-bottom:0.35rem;text-transform:uppercase;">Perimeter Workforce Apps · internal only</p>
      <div id="product-matrix-status">Probing local fleet…</div>
      <div id="product-matrix-list">${fleetPanelRows}</div>
      <div style="margin-top:1rem;font-size:0.65rem;color:#64748b;text-transform:uppercase;">Baselines (¢)</div>
      <div class="baseline"><span>Demo seed (medshield)</span><span>${SOVEREIGN_POOL_BASELINES_CENTS.medshield}</span></div>
      <div class="baseline"><span>Demo seed (vaultbank)</span><span>${SOVEREIGN_POOL_BASELINES_CENTS.vaultbank}</span></div>
      <div class="baseline"><span>Demo seed (gridcore)</span><span>${SOVEREIGN_POOL_BASELINES_CENTS.gridcore}</span></div>
    </section>
  </main>
  <script>
    var activeAgentId = 'auto';
    var activeAgentRole = 'Auto-Routing';
    var historiesByAgent = {};
    var streamingText = '';
    var streamingGrounding = null;
    var streamingToolHint = '';
    var isStreamingActive = false;
    var cachedSpeechVoices = [];
    var VOICE_SPEED_KEY = 'ironboard_voice_speed';
    var VOICE_PITCH_KEY = 'ironboard_voice_pitch';
    var CHAT_HISTORY_KEY = 'ironboard_chat_history';

    /** Resolve API paths against <base href> so ops-portal iframe proxy works (root-absolute /api ignores base). */
    function boardApiUrl(path) {
      // Use RegExp ctor — a /^\\// literal is corrupted inside this HTML template string.
      var clean = String(path || '').replace(new RegExp('^/'), '');
      var root =
        (typeof window !== 'undefined' && window.__IRONBOARD_API_ROOT__) ||
        document.baseURI ||
        '/';
      // Without a trailing slash, URL() treats the last segment as a file and drops it —
      // e.g. .../ironboard-console + api/query → .../operations-hub/api/query (breaks Query).
      if (root.charAt(root.length - 1) !== '/') root = root + '/';
      try {
        return new URL(clean, root).href;
      } catch (err) {
        return '/' + clean;
      }
    }

    /**
     * Third-party iframe embeds (ops portal → Cloud Run) may throw SecurityError on
     * localStorage access. Never let storage faults abort board boot / Query binding.
     */
    function safeStorageGet(key) {
      try {
        return localStorage.getItem(key);
      } catch (err) {
        return null;
      }
    }

    function safeStorageSet(key, value) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (err) {
        return false;
      }
    }

    function persistChatHistory() {
      if (!safeStorageSet(CHAT_HISTORY_KEY, JSON.stringify(historiesByAgent))) {
        console.warn('[IRONBOARD] Chat history persist failed (storage blocked).');
      }
    }

    function isLegacyOrOpsFaultText(text) {
      if (!text || typeof text !== 'string') return false;
      return /Live stream faulted|verify GOOGLE_API_KEY|CORE_TELEMETRY_DISCONNECTED|Gemini rate limit|Gemini rejected the API key|could not reach Gemini|tool configuration/i.test(text);
    }

    function scrubLegacyFaultTurns(history) {
      if (!Array.isArray(history)) return history;
      return history.filter(function(turn) {
        if (!turn || turn.role !== 'model') return true;
        return !isLegacyOrOpsFaultText(turn.text);
      });
    }

    function isTransientStreamFault(text) {
      if (!text || typeof text !== 'string') return false;
      return /rate limit|quota hit|could not reach Gemini|Retry in a moment|network/i.test(text) &&
        !/GOOGLE_API_KEY|rejected the API key|tool configuration|CORE_TELEMETRY/i.test(text);
    }

    function hydrateChatHistory() {
      try {
        var raw = safeStorageGet(CHAT_HISTORY_KEY);
        if (!raw) return;
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          var scrubbed = {};
          Object.keys(parsed).forEach(function(agentKey) {
            scrubbed[agentKey] = scrubLegacyFaultTurns(parsed[agentKey]);
          });
          historiesByAgent = scrubbed;
          persistChatHistory();
        }
      } catch (err) {
        console.warn('[IRONBOARD] Chat history hydrate failed:', err);
      }
    }

    function hydrateVoiceSettings() {
      var speedInput = document.getElementById('voice-speed-slider');
      var pitchInput = document.getElementById('voice-pitch-slider');
      var speedDisplay = document.getElementById('speed-val-display');
      var pitchDisplay = document.getElementById('pitch-val-display');
      var savedSpeed = safeStorageGet(VOICE_SPEED_KEY);
      var savedPitch = safeStorageGet(VOICE_PITCH_KEY);
      if (savedSpeed && speedInput) {
        speedInput.value = savedSpeed;
        if (speedDisplay) speedDisplay.textContent = savedSpeed + 'x';
      }
      if (savedPitch && pitchInput) {
        pitchInput.value = savedPitch;
        if (pitchDisplay) pitchDisplay.textContent = savedPitch;
      }
    }

    function bindVoiceSliders() {
      var speedInput = document.getElementById('voice-speed-slider');
      var pitchInput = document.getElementById('voice-pitch-slider');
      var speedDisplay = document.getElementById('speed-val-display');
      var pitchDisplay = document.getElementById('pitch-val-display');
      if (speedInput) {
        speedInput.addEventListener('input', function() {
          safeStorageSet(VOICE_SPEED_KEY, speedInput.value);
          if (speedDisplay) speedDisplay.textContent = speedInput.value + 'x';
        });
      }
      if (pitchInput) {
        pitchInput.addEventListener('input', function() {
          safeStorageSet(VOICE_PITCH_KEY, pitchInput.value);
          if (pitchDisplay) pitchDisplay.textContent = pitchInput.value;
        });
      }
    }

    function getVoiceRate() {
      var speedInput = document.getElementById('voice-speed-slider');
      var rate = speedInput
        ? parseFloat(speedInput.value)
        : parseFloat(safeStorageGet(VOICE_SPEED_KEY) || '1');
      return Math.min(Math.max(rate, 0.5), 2.5);
    }

    function getVoicePitch() {
      var pitchInput = document.getElementById('voice-pitch-slider');
      var pitch = pitchInput
        ? parseFloat(pitchInput.value)
        : parseFloat(safeStorageGet(VOICE_PITCH_KEY) || '1');
      return Math.min(Math.max(pitch, 0.5), 1.5);
    }

    function synthesisRate() {
      return Math.min(Math.max(getVoiceRate(), 0.75), 1.25);
    }

    function synthesisPitch() {
      return Math.min(Math.max(getVoicePitch(), 0.85), 1.15);
    }

    function prepareSpeechText(raw) {
      var t = String(raw || '');
      var out = '';
      for (var i = 0; i < t.length; i++) {
        var code = t.charCodeAt(i);
        if (code === 10 || code === 13 || code === 9) out += ' ';
        else if (code >= 32 && code !== 127) out += t.charAt(i);
      }
      var tick = String.fromCharCode(96);
      var fence = tick + tick + tick;
      out = out.split(fence).join(' ');
      out = out.split(tick).join('');
      out = out.split('**').join('');
      out = out.split('__').join('');
      out = out.split('*').join('');
      out = out.split('_').join(' ');
      out = out.split('#').join(' ');
      out = out.split('.md').join('');
      while (out.indexOf('  ') !== -1) out = out.split('  ').join(' ');
      out = out.trim();
      if (out.length > 720) {
        var cut = out.slice(0, 720);
        var dot = cut.lastIndexOf('.');
        out = dot > 280 ? cut.slice(0, dot + 1) : cut;
      }
      return out;
    }

    function refreshSpeechVoices() {
      if (!window.speechSynthesis) return;
      cachedSpeechVoices = window.speechSynthesis.getVoices();
    }

    function pickExecutiveVoice(agentRole) {
      if (!cachedSpeechVoices.length) return null;
      var english = cachedSpeechVoices.filter(function(v) {
        return (v.lang || '').toLowerCase().indexOf('en') === 0;
      });
      var pool = english.length ? english : cachedSpeechVoices;
      var prefs = ['Microsoft Jenny', 'Microsoft Aria', 'Google US English', 'Samantha', 'Daniel'];
      if (agentRole && (agentRole.indexOf('CFO') !== -1 || agentRole.indexOf('CTO') !== -1 || agentRole.indexOf('Technical') !== -1)) {
        prefs = ['Microsoft David', 'Microsoft Mark', 'Guy'];
      }
      for (var p = 0; p < prefs.length; p++) {
        var matched = pool.find(function(v) { return v.name.indexOf(prefs[p]) !== -1; });
        if (matched) return matched;
      }
      return pool.find(function(v) { return v.localService; }) || pool[0] || null;
    }

    function speakPanelText(text, agentRole) {
      if (!window.speechSynthesis) return;
      var speechText = prepareSpeechText(text);
      if (!speechText) return;
      window.speechSynthesis.cancel();
      setTimeout(function deliverSpeech() {
        refreshSpeechVoices();
        if (!cachedSpeechVoices.length) {
          setTimeout(deliverSpeech, 120);
          return;
        }
        var utterance = new SpeechSynthesisUtterance(speechText);
        utterance.lang = 'en-US';
        utterance.rate = synthesisRate();
        utterance.pitch = synthesisPitch();
        utterance.volume = 1;
        var voice = pickExecutiveVoice(agentRole);
        if (voice) utterance.voice = voice;
        window.speechSynthesis.speak(utterance);
      }, 80);
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = refreshSpeechVoices;
    }
    // Guard boot: uncaught localStorage SecurityError used to abort before Query listeners bound.
    try {
      hydrateVoiceSettings();
      bindVoiceSliders();
    } catch (bootErr) {
      console.warn('[IRONBOARD] Voice settings boot skipped:', bootErr);
    }
    refreshSpeechVoices();


    function syncQueryComposeForAgent(btn) {
      var isolated = btn && btn.getAttribute('data-isolated') === 'true';
      var ironframeRoute = btn ? btn.getAttribute('data-ironframe-route') || '' : '';
      var prompt = document.getElementById('user-prompt');
      var submitBtn = document.getElementById('submit-btn');
      var pttBtn = document.getElementById('ptt-btn');
      if (prompt) {
        prompt.disabled = !!isolated;
        prompt.placeholder = isolated
          ? 'Doc author — use Ironframe ' + ironframeRoute + ' (:3000)'
          : 'Ask the board…';
      }
      if (submitBtn) submitBtn.disabled = !!isolated;
      if (pttBtn) pttBtn.disabled = !!isolated;
      if (isolated) {
        setStatus('Documentation author — isolated from live boardroom chat. Use POST ' + ironframeRoute + ' on Ironframe (:3000).');
      } else if (document.getElementById('status').textContent.indexOf('Documentation author') === 0) {
        setStatus('');
      }
    }

    document.getElementById('roster').addEventListener('click', function(ev) {
      var btn = ev.target.closest('.roster-btn');
      if (!btn) return;
      document.querySelectorAll('.roster-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      activeAgentId = btn.getAttribute('data-id') || 'auto';
      activeAgentRole = btn.getAttribute('data-role') || 'Auto-Routing';
      document.getElementById('active-label').textContent = 'Active: ' + activeAgentRole;
      syncQueryComposeForAgent(btn);
      streamingText = '';
      streamingGrounding = null;
      streamingToolHint = '';
      isStreamingActive = false;
      renderChat();
    });

    function getConversationHistory() {
      if (!historiesByAgent[activeAgentId]) historiesByAgent[activeAgentId] = [];
      return historiesByAgent[activeAgentId];
    }

    function escapeHtml(value) {
      var s = String(value || '');
      var out = '';
      for (var i = 0; i < s.length; i++) {
        var ch = s.charAt(i);
        if (ch === '&') out += '&amp;';
        else if (ch === '<') out += '&lt;';
        else if (ch === '>') out += '&gt;';
        else if (ch === '"') out += '&quot;';
        else out += ch;
      }
      return out;
    }

    function scrollChatToBottom() {
      var chatWindow = document.getElementById('chat-window');
      if (!chatWindow) return;
      function pinBottom() {
        chatWindow.scrollTop = chatWindow.scrollHeight;
      }
      pinBottom();
      requestAnimationFrame(function() {
        pinBottom();
        requestAnimationFrame(function() {
          pinBottom();
          setTimeout(pinBottom, 0);
        });
      });
    }

    function bindCenterPaneAutoScroll() {
      var chatWindow = document.getElementById('chat-window');
      if (!chatWindow || chatWindow.dataset.scrollBound === '1') return;
      chatWindow.dataset.scrollBound = '1';
      new MutationObserver(function() {
        scrollChatToBottom();
      }).observe(chatWindow, { childList: true, subtree: true, characterData: true });
    }

    function updateStreamingBubble() {
      var chatWindow = document.getElementById('chat-window');
      if (!chatWindow) return;
      var body = chatWindow.querySelector('.msg-streaming .streaming-body');
      if (body) {
        body.textContent = streamingText;
        scrollChatToBottom();
        return;
      }
      renderChat();
    }

    bindCenterPaneAutoScroll();

    var TARGET_COUNTRIES_KEY = 'ironboard_target_countries';
    var DEFAULT_TARGET_COUNTRIES = 'Germany, Australia, Ireland, Canada';
    var selectedProspectDomain = '';
    var selectedProspectId = '';
    var loadedProspects = [];

    function parseTargetCountriesInput(raw) {
      return String(raw || '')
        .split(/[,|;]+/)
        .map(function(part) { return part.trim(); })
        .filter(Boolean);
    }

    function formatTargetCountriesPayload(countries) {
      return countries.map(function(c) { return c.trim().toUpperCase(); }).join(',');
    }

    function hydrateTargetCountriesInput() {
      var input = document.getElementById('target-countries-input');
      if (!input) return;
      var saved = '';
      try { saved = safeStorageGet(TARGET_COUNTRIES_KEY) || ''; } catch (e) { saved = ''; }
      input.value = (saved && saved.trim()) ? saved.trim() : DEFAULT_TARGET_COUNTRIES;
      updateTargetCountriesPayload();
    }

    function updateTargetCountriesPayload() {
      var input = document.getElementById('target-countries-input');
      var payloadEl = document.getElementById('target-countries-payload');
      if (!input || !payloadEl) return;
      var countries = parseTargetCountriesInput(input.value);
      payloadEl.textContent = countries.length ? formatTargetCountriesPayload(countries) : 'PENDING TARGET INPUT';
    }

    function getActiveHubPayload() {
      var input = document.getElementById('target-countries-input');
      var countries = parseTargetCountriesInput(input ? input.value : '');
      return countries.length ? formatTargetCountriesPayload(countries) : '';
    }

    function setMarketStatus(msg) {
      var el = document.getElementById('market-status');
      if (el) el.textContent = msg || '';
    }

    function icpScoreFor(prospect) {
      if (!prospect) return 0;
      if (prospect.icpScore != null) return prospect.icpScore;
      if (prospect.aiFitnessScore != null) return prospect.aiFitnessScore;
      return 0;
    }

    function renderProspectList(prospects) {
      loadedProspects = prospects || [];
      var listEl = document.getElementById('prospect-list');
      if (!listEl) return;
      if (!loadedProspects.length) {
        listEl.innerHTML = '<div class="prospect-empty">No qualified targets (score ≥ 100). Load a prospecting batch.</div>';
        return;
      }
      var html = '';
      for (var i = 0; i < loadedProspects.length; i++) {
        var p = loadedProspects[i];
        var selected = p.domain === selectedProspectDomain ? ' selected' : '';
        var funding = (p.recentFunding || 'NONE').toUpperCase();
        var hireTag = p.hasComplianceJob ? 'GRC hire' : 'no GRC hire';
        var score = icpScoreFor(p);
        html +=
          '<div class="prospect-row' + selected + '" data-domain="' + escapeHtml(p.domain) + '" data-prospect-id="' + escapeHtml(p.id) + '">' +
          '<div><div class="firm-name">' + escapeHtml(p.companyName) + '</div>' +
          '<div class="firm-meta">' + escapeHtml(p.region) + ' · ' + p.employeeCount + ' emp · ' +
          escapeHtml(p.compliancePressure) + ' · ' + escapeHtml(funding) + ' · ' + hireTag + ' · ' +
          escapeHtml(p.dealStage) + '</div></div>' +
          '<span class="score-pill" data-score="' + score + '" title="icpScore">' + score + '</span></div>';
      }
      listEl.innerHTML = html;
    }

    function updateHarvestButtons() {
      var pos = document.getElementById('harvest-positive');
      var neg = document.getElementById('harvest-negative');
      var enabled = !!selectedProspectDomain;
      if (pos) pos.disabled = !enabled;
      if (neg) neg.disabled = !enabled;
    }

    async function loadProspectingBatch() {
      var btn = document.getElementById('fetch-batch-btn');
      var input = document.getElementById('target-countries-input');
      var countries = parseTargetCountriesInput(input ? input.value : '');
      if (!countries.length) {
        setMarketStatus('Enter at least one target country or region.');
        return;
      }
      try { safeStorageSet(TARGET_COUNTRIES_KEY, input ? input.value : ''); } catch (e) {}
      updateTargetCountriesPayload();
      if (btn) btn.disabled = true;
      selectedProspectDomain = '';
      selectedProspectId = '';
      loadedProspects = [];
      updateHarvestButtons();
      var label = countries.join(', ');
      setMarketStatus('Running live web discovery for ' + label + '…');
      try {
        var response = await fetch(boardApiUrl('/api/prospects/trigger'), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetCountries: countries })
        });
        if (!response.ok) throw new Error('Batch fetch failed: ' + response.status);
        var data = await response.json();
        renderProspectList(data.prospects || []);
        setMarketStatus('Loaded ' + (data.prospects || []).length + ' live-grounded prospects · ' + label);
      } catch (err) {
        console.error(err);
        setMarketStatus(err && err.message ? err.message : 'Batch load failed.');
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    async function selectProspect(domain, prospectId) {
      selectedProspectDomain = domain;
      selectedProspectId = prospectId || '';
      updateHarvestButtons();
      var rows = document.querySelectorAll('.prospect-row');
      rows.forEach(function(row) {
        row.classList.toggle('selected', row.getAttribute('data-domain') === domain);
      });
      var pitchPane = document.getElementById('pitch-preview-pane');
      if (pitchPane) pitchPane.value = 'Generating grounded outreach…';
      setMarketStatus('Staging pitch for ' + domain + '…');
      try {
        var response = await fetch(boardApiUrl('/api/market/pitch'), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain: domain })
        });
        if (!response.ok) {
          var errBody = await response.json().catch(function() { return {}; });
          throw new Error(errBody.error || ('Pitch failed: ' + response.status));
        }
        var data = await response.json();
        if (pitchPane) pitchPane.value = data.pitch || '';
        setMarketStatus('Pitch staged · BigInt precision + ' + (data.compliancePressure || 'GRC') + ' guard');
      } catch (err) {
        console.error(err);
        if (pitchPane) pitchPane.value = '';
        setMarketStatus(err && err.message ? err.message : 'Pitch generation failed.');
      }
    }

    async function harvestSignal(isPositive) {
      if (!selectedProspectDomain) return;
      var pos = document.getElementById('harvest-positive');
      var neg = document.getElementById('harvest-negative');
      if (pos) pos.disabled = true;
      if (neg) neg.disabled = true;
      setMarketStatus('Harvesting signal for ' + selectedProspectDomain + '…');
      try {
        var response = await fetch(boardApiUrl('/api/prospects/signal'), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domain: selectedProspectDomain,
            responseText: (document.getElementById('pitch-preview-pane') || {}).value || '',
            isPositive: isPositive
          })
        });
        if (!response.ok) throw new Error('Harvest failed: ' + response.status);
        var data = await response.json();
        var nextScore = data.icpScore != null ? data.icpScore : (data.aiFitnessScore != null ? data.aiFitnessScore : 0);

        for (var h = 0; h < loadedProspects.length; h++) {
          if (loadedProspects[h].domain === selectedProspectDomain) {
            loadedProspects[h].icpScore = nextScore;
            loadedProspects[h].aiFitnessScore = nextScore;
            if (data.newStatus) loadedProspects[h].dealStage = data.newStatus;
            break;
          }
        }
        renderProspectList(loadedProspects);

        var history = getConversationHistory();
        history.push({
          role: 'model',
          text: '[Flywheel] ' + selectedProspectDomain + ' → ' + data.newStatus +
            ' · icpScore=' + nextScore + ' (' + (isPositive ? '+25' : '−25') + ')'
        });
        persistChatHistory();
        renderChat();
        scrollChatToBottom();

        setMarketStatus('Signal harvested · ' + data.newStatus + ' · score ' + nextScore);
      } catch (err) {
        console.error(err);
        setMarketStatus(err && err.message ? err.message : 'Harvest failed.');
      } finally {
        updateHarvestButtons();
      }
    }

    hydrateTargetCountriesInput();
    var targetCountriesInput = document.getElementById('target-countries-input');
    if (targetCountriesInput) {
      targetCountriesInput.addEventListener('input', function() {
        try { safeStorageSet(TARGET_COUNTRIES_KEY, targetCountriesInput.value); } catch (e) {}
        updateTargetCountriesPayload();
      });
    }

    document.getElementById('fetch-batch-btn').addEventListener('click', loadProspectingBatch);

    document.getElementById('prospect-list').addEventListener('click', function(ev) {
      var row = ev.target.closest('.prospect-row');
      if (!row) return;
      var domain = row.getAttribute('data-domain');
      var prospectId = row.getAttribute('data-prospect-id');
      if (domain) selectProspect(domain, prospectId);
    });

    document.getElementById('harvest-positive').addEventListener('click', function() {
      harvestSignal(true);
    });

    document.getElementById('harvest-negative').addEventListener('click', function() {
      harvestSignal(false);
    });

    function renderGroundingPanel(grounding) {
      if (!grounding) return '';
      var html = '';
      if (grounding.webSearchQueries && grounding.webSearchQueries.length) {
        html += '<div class="grounding-queries"><span class="grounding-label">Web search</span>';
        for (var q = 0; q < grounding.webSearchQueries.length; q++) {
          html += '<span class="grounding-query">' + escapeHtml(grounding.webSearchQueries[q]) + '</span>';
        }
        html += '</div>';
      }
      if (grounding.sources && grounding.sources.length) {
        html += '<div class="grounding-sources"><span class="grounding-label">Sources</span><ul>';
        for (var s = 0; s < grounding.sources.length; s++) {
          var source = grounding.sources[s];
          var label = source.title || source.domain || source.uri || 'Source';
          if (source.uri) {
            html += '<li><a href="' + escapeHtml(source.uri) + '" target="_blank" rel="noopener noreferrer">' +
              escapeHtml(label) + '</a></li>';
          } else {
            html += '<li>' + escapeHtml(label) + '</li>';
          }
        }
        html += '</ul></div>';
      }
      return html ? '<div class="grounding-panel">' + html + '</div>' : '';
    }

    function renderChat() {
      var chatWindow = document.getElementById('chat-window');
      if (!chatWindow) return;
      var history = getConversationHistory();
      var parts = [];
      for (var i = 0; i < history.length; i++) {
        var turn = history[i];
        if (turn.role === 'user') {
          parts.push(
            '<div class="msg-user"><div class="msg-user-label">You</div>' +
            escapeHtml(turn.text) + '</div>'
          );
        } else {
          parts.push(
            '<div class="msg-model"><div class="msg-model-label">' + escapeHtml(activeAgentRole) + '</div>' +
            escapeHtml(turn.text) +
            renderGroundingPanel(turn.grounding) +
            '</div>'
          );
        }
      }
      if (isStreamingActive || streamingText || streamingGrounding || streamingToolHint) {
        parts.push(
          '<div class="msg-model msg-streaming"><div class="msg-model-label">' + escapeHtml(activeAgentRole) + '</div>' +
          '<div class="streaming-body">' + escapeHtml(streamingText) + '</div>' +
          (streamingToolHint ? '<div class="tool-call-hint">' + escapeHtml(streamingToolHint) + '</div>' : '') +
          renderGroundingPanel(streamingGrounding) +
          '</div>'
        );
      }
      parts.push('<div class="chat-scroll-anchor" aria-hidden="true"></div>');
      chatWindow.innerHTML = '<div id="chat-messages">' + parts.join('') + '</div>';
      scrollChatToBottom();
    }

    function setStatus(msg) {
      document.getElementById('status').textContent = msg || '';
    }

    function pushToken(token) {
      streamingText += token;
      updateStreamingBubble();
    }

    function flushStreamingBuffer() {
      streamingText = '';
      streamingToolHint = '';
      if (!isStreamingActive) return;
      var chatWindow = document.getElementById('chat-window');
      if (!chatWindow) return;
      var body = chatWindow.querySelector('.msg-streaming .streaming-body');
      if (body) {
        body.textContent = '';
        var hint = chatWindow.querySelector('.msg-streaming .tool-call-hint');
        if (hint) hint.remove();
        scrollChatToBottom();
        return;
      }
      renderChat();
    }

    function processSseBuffer(buffer) {
      var parts = buffer.split('\\n\\n');
      var remainder = parts.pop() || '';
      for (var i = 0; i < parts.length; i++) {
        var block = parts[i].trim();
        if (block.indexOf('data: ') !== 0) continue;
        var jsonStr = block.slice(6);
        if (!jsonStr) continue;
        try {
          var payload = JSON.parse(jsonStr);
          if (payload && payload.streamFlush) {
            flushStreamingBuffer();
            continue;
          }
          if (payload && typeof payload.token === 'string') pushToken(payload.token);
          if (payload && payload.grounding) {
            streamingGrounding = payload.grounding;
            renderChat();
          }
          if (payload && payload.toolCall) {
            var tc = payload.toolCall;
            if (tc.status === 'running') {
              streamingToolHint = 'Querying local workspace (' + String(tc.queryType || tc.name || 'tool') + ')…';
            } else if (tc.status === 'complete') {
              streamingToolHint = tc.ok === false
                ? 'Workspace query returned an error — continuing with available context…'
                : 'Workspace data loaded — synthesizing strategy…';
            }
            renderChat();
          }
        } catch (err) {
          console.error('SSE parse error:', err);
        }
      }
      return remainder;
    }

    document.getElementById('user-prompt').addEventListener('keydown', function(ev) {
      if (ev.key === 'Enter' && !ev.shiftKey) {
        ev.preventDefault();
        document.getElementById('query-form').requestSubmit();
      }
    });

    document.getElementById('query-form').addEventListener('submit', async function(ev) {
      ev.preventDefault();
      var input = document.getElementById('user-prompt');
      var submitBtn = document.getElementById('submit-btn');
      var query = input.value.trim();
      if (!query) return;

      if (window.speechSynthesis) window.speechSynthesis.cancel();
      streamingText = '';
      streamingGrounding = null;
      streamingToolHint = '';
      isStreamingActive = true;

      var conversationHistory = getConversationHistory();
      conversationHistory.push({ role: 'user', text: query });
      persistChatHistory();
      renderChat();

      submitBtn.disabled = true;
      var pttBtnStream = document.getElementById('ptt-btn');
      if (pttBtnStream) pttBtnStream.disabled = true;
      setStatus('Streaming…');

      async function runQueryStream(attempt) {
        streamingText = '';
        streamingGrounding = null;
        streamingToolHint = '';
        var response = await fetch(boardApiUrl('/api/query'), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
          body: JSON.stringify({
            agentId: activeAgentId,
            history: conversationHistory,
            activeHub: getActiveHubPayload(),
            selectedProspectId: selectedProspectId || null
          })
        });

        if (!response.ok || !response.body) {
          var errBody = null;
          try {
            errBody = await response.json();
          } catch (parseErr) {
            errBody = null;
          }
          if (response.status === 502 && errBody && errBody.error === 'CORE_TELEMETRY_DISCONNECTED') {
            throw new Error(
              'Ironframe core telemetry unreachable from this board worker. Confirm IRONFRAME_CORE_ORIGIN points at the live control plane (e.g. https://ironframegrc.com), then redeploy Ironboard.'
            );
          }
          if (response.status === 401 || response.status === 403) {
            throw new Error(
              'Ops session expired or unauthorized for the boardroom proxy — refresh the operations portal and sign in again.'
            );
          }
          if (attempt < 1 && (response.status === 429 || response.status >= 500)) {
            setStatus('Transient fault — retrying once…');
            await new Promise(function(resolve) { setTimeout(resolve, 1200); });
            return runQueryStream(attempt + 1);
          }
          throw new Error('Request failed: ' + response.status);
        }

        var reader = response.body.getReader();
        var decoder = new TextDecoder();
        var sseBuffer = '';

        while (true) {
          var chunk = await reader.read();
          if (chunk.done) break;
          sseBuffer += decoder.decode(chunk.value, { stream: true });
          sseBuffer = processSseBuffer(sseBuffer);
        }

        if (sseBuffer.trim()) {
          processSseBuffer(sseBuffer + '\\n\\n');
        }

        if (attempt < 1 && isTransientStreamFault(streamingText)) {
          setStatus('Transient Gemini fault — retrying once…');
          await new Promise(function(resolve) { setTimeout(resolve, 1200); });
          return runQueryStream(attempt + 1);
        }

        return streamingText;
      }

      try {
        var assistantReply = await runQueryStream(0);
        if (assistantReply && !isLegacyOrOpsFaultText(assistantReply)) {
          var modelTurn = { role: 'model', text: assistantReply };
          if (streamingGrounding) modelTurn.grounding = streamingGrounding;
          conversationHistory.push(modelTurn);
          persistChatHistory();
        } else if (assistantReply && isLegacyOrOpsFaultText(assistantReply)) {
          setStatus(assistantReply);
        }
        streamingText = '';
        streamingGrounding = null;
        streamingToolHint = '';
        isStreamingActive = false;
        renderChat();
        scrollChatToBottom();

        if (assistantReply && !isLegacyOrOpsFaultText(assistantReply)) {
          setStatus('Complete.');
          input.value = '';
          speakPanelText(assistantReply, activeAgentRole);
        } else if (!assistantReply) {
          setStatus('Stream ended with no tokens.');
        }
      } catch (err) {
        console.error(err);
        streamingText = '';
        streamingGrounding = null;
        streamingToolHint = '';
        isStreamingActive = false;
        renderChat();
        scrollChatToBottom();
        setStatus(err && err.message ? err.message : 'Stream failed.');
      } finally {
        submitBtn.disabled = false;
        var pttBtnDone = document.getElementById('ptt-btn');
        if (pttBtnDone) pttBtnDone.disabled = false;
      }
    });

    /**
     * Push-to-talk (PTT): click to record, click again to Gemini-transcribe and auto-Query.
     * Bound AFTER Query listeners and wrapped so mic/STT faults cannot unbind the board.
     * No wake-word / always-on listening.
     */
    (function bindBoardPtt() {
      try {
        var pttBtn = document.getElementById('ptt-btn');
        if (!pttBtn) return;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          pttBtn.disabled = true;
          pttBtn.title = 'Microphone API unavailable in this browser';
          return;
        }
        if (typeof MediaRecorder === 'undefined') {
          pttBtn.disabled = true;
          pttBtn.title = 'MediaRecorder unavailable in this browser';
          return;
        }

        var pttRecorder = null;
        var pttChunks = [];
        var pttActive = false;
        var pttBusy = false;
        var pttStartedAt = 0;
        var pttDeviceLabel = '';
        var pttAudioCtx = null;
        var pttAnalyser = null;
        var pttPeak = 0;
        var pttMeterTimer = null;
        var pttMeterArmed = false;

        function pickRecorderMime() {
          var candidates = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            'audio/ogg;codecs=opus'
          ];
          for (var i = 0; i < candidates.length; i++) {
            try {
              if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(candidates[i])) {
                return candidates[i];
              }
            } catch (err) {}
          }
          return '';
        }

        function scoreMicLabel(label) {
          var s = String(label || '').toLowerCase();
          var score = 0;
          // Virtual / loopback devices often have zero spoken audio.
          if (/vb-audio|virtual cable|cable (in|input|output)|stereo mix|what u hear|boom audio|Voicemeeter/i.test(s)) {
            score -= 80;
          }
          if (/microphone|headset mic|fifine|bose|array|usb audio/i.test(s)) score += 30;
          if (/headset microphone|fifine|bose flex/i.test(s)) score += 20;
          return score;
        }

        async function resolvePreferredMic() {
          // Need a permission grant before device labels populate.
          var probe = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
          try {
            probe.getTracks().forEach(function(t) { t.stop(); });
          } catch (err) {}

          var devices = await navigator.mediaDevices.enumerateDevices();
          var inputs = devices.filter(function(d) { return d.kind === 'audioinput'; });
          if (!inputs.length) {
            return { deviceId: undefined, label: '(default)' };
          }
          var ranked = inputs
            .map(function(d) {
              return { deviceId: d.deviceId, label: d.label || '(unnamed mic)', score: scoreMicLabel(d.label) };
            })
            .sort(function(a, b) { return b.score - a.score; });
          return ranked[0];
        }

        function blobToBase64(blob) {
          return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onloadend = function() {
              var result = String(reader.result || '');
              var comma = result.indexOf(',');
              resolve(comma >= 0 ? result.slice(comma + 1) : result);
            };
            reader.onerror = function() { reject(reader.error || new Error('FileReader failed')); };
            reader.readAsDataURL(blob);
          });
        }

        function stopMeter() {
          if (pttMeterTimer) {
            clearInterval(pttMeterTimer);
            pttMeterTimer = null;
          }
          try {
            if (pttAudioCtx) pttAudioCtx.close();
          } catch (err) {}
          pttAudioCtx = null;
          pttAnalyser = null;
          pttMeterArmed = false;
        }

        function startMeter(stream) {
          stopMeter();
          pttPeak = 0;
          try {
            var Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            pttAudioCtx = new Ctx();
            var source = pttAudioCtx.createMediaStreamSource(stream);
            pttAnalyser = pttAudioCtx.createAnalyser();
            pttAnalyser.fftSize = 256;
            source.connect(pttAnalyser);
            pttMeterArmed = true;
            var data = new Uint8Array(pttAnalyser.frequencyBinCount);
            pttMeterTimer = setInterval(function() {
              if (!pttAnalyser) return;
              pttAnalyser.getByteTimeDomainData(data);
              var peak = 0;
              for (var i = 0; i < data.length; i++) {
                var v = Math.abs(data[i] - 128);
                if (v > peak) peak = v;
              }
              if (peak > pttPeak) pttPeak = peak;
              if (pttActive) {
                var level = peak < 3 ? 'silent' : peak < 12 ? 'quiet' : 'hot';
                setStatus(
                  'PTT recording (' + level + ') via ' + (pttDeviceLabel || 'mic') +
                    ' — click PTT again to finish.'
                );
              }
            }, 200);
          } catch (err) {
            console.warn('[IRONBOARD] PTT meter unavailable:', err);
            pttMeterArmed = false;
          }
        }

        async function stopPttAndSubmit() {
          if (!pttRecorder || !pttActive) return;
          pttBusy = true;
          pttActive = false;
          pttBtn.dataset.recording = '0';
          pttBtn.textContent = 'PTT';
          stopMeter();

          var elapsedMs = Date.now() - pttStartedAt;
          if (elapsedMs < 700) {
            try { pttRecorder.requestData(); } catch (err) {}
            try { pttRecorder.stop(); } catch (err) {}
            try {
              var earlyStream = pttRecorder._stream;
              if (earlyStream) earlyStream.getTracks().forEach(function(t) { try { t.stop(); } catch (e) {} });
            } catch (err) {}
            pttRecorder = null;
            pttChunks = [];
            setStatus('PTT: hold at least ~1s while speaking, then click again.');
            pttBusy = false;
            return;
          }

          setStatus('PTT: transcribing via ' + (pttDeviceLabel || 'mic') + '…');

          var blob = await new Promise(function(resolve) {
            var finished = false;
            var done = function() {
              if (finished) return;
              finished = true;
              resolve(new Blob(pttChunks, { type: (pttRecorder && pttRecorder.mimeType) || 'audio/webm' }));
            };
            pttRecorder.onstop = done;
            try {
              pttRecorder.requestData();
            } catch (err) {}
            try {
              pttRecorder.stop();
            } catch (err) {
              done();
            }
            setTimeout(done, 1500);
          });

          try {
            var streamRef = pttRecorder && pttRecorder._stream;
            if (streamRef) {
              streamRef.getTracks().forEach(function(t) {
                try { t.stop(); } catch (err) {}
              });
            }
          } catch (err) {}

          pttRecorder = null;
          pttChunks = [];

          if (!blob || blob.size < 256) {
            setStatus('PTT: no audio captured — check mic permission and Windows input device.');
            pttBusy = false;
            return;
          }

          if (pttMeterArmed && pttPeak < 3) {
            setStatus(
              'PTT: mic stayed silent (' + (pttDeviceLabel || 'device') +
                '). Windows Sound → Input: pick Headset/fifine mic, not VB-Audio Cable. Then retry.'
            );
            pttBusy = false;
            return;
          }

          try {
            var audioBase64 = await blobToBase64(blob);
            var response = await fetch(boardApiUrl('/api/voice/transcribe'), {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: audioBase64,
                mimeType: blob.type || 'audio/webm'
              })
            });
            var payload = null;
            try {
              payload = await response.json();
            } catch (parseErr) {
              payload = null;
            }
            if (!response.ok) {
              setStatus(
                'PTT: transcribe failed' +
                  (payload && payload.error ? ' (' + payload.error + ')' : ' HTTP ' + response.status)
              );
              pttBusy = false;
              return;
            }
            var transcript = payload && typeof payload.transcript === 'string'
              ? payload.transcript.trim()
              : '';
            if (!transcript) {
              setStatus(
                'PTT: Gemini heard silence from ' + (pttDeviceLabel || 'mic') +
                  '. Switch Windows default input away from VB-Audio Cable / Boom, then retry.'
              );
              pttBusy = false;
              return;
            }
            var input = document.getElementById('user-prompt');
            if (input) input.value = transcript;
            setStatus('PTT: “' + (transcript.length > 80 ? transcript.slice(0, 80) + '…' : transcript) + '”');
            document.getElementById('query-form').requestSubmit();
          } catch (err) {
            setStatus('PTT failed: ' + (err && err.message ? err.message : String(err)));
          } finally {
            pttBusy = false;
          }
        }

        async function startPtt() {
          if (pttBusy || isStreamingActive) return;
          try {
            var preferred = await resolvePreferredMic();
            pttDeviceLabel = preferred.label || '(default)';
            var constraints = {
              audio: preferred.deviceId
                ? {
                    deviceId: { ideal: preferred.deviceId },
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                  }
                : {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                  }
            };
            var stream = await navigator.mediaDevices.getUserMedia(constraints);
            var track = stream.getAudioTracks()[0];
            if (track && track.label) pttDeviceLabel = track.label;

            var mime = pickRecorderMime();
            pttChunks = [];
            pttRecorder = mime
              ? new MediaRecorder(stream, { mimeType: mime })
              : new MediaRecorder(stream);
            pttRecorder._stream = stream;
            pttRecorder.ondataavailable = function(ev) {
              if (ev.data && ev.data.size > 0) pttChunks.push(ev.data);
            };
            pttRecorder.start(200);
            pttStartedAt = Date.now();
            pttActive = true;
            pttBtn.dataset.recording = '1';
            pttBtn.textContent = 'REC';
            startMeter(stream);
            setStatus('PTT recording via ' + pttDeviceLabel + ' — speak, then click PTT again.');
          } catch (err) {
            setStatus('PTT mic denied — click the lock icon in the address bar → allow Microphone for this site.');
            console.warn('[IRONBOARD] PTT getUserMedia failed:', err);
          }
        }

        pttBtn.addEventListener('click', function() {
          if (pttBusy) return;
          if (pttActive) {
            stopPttAndSubmit();
            return;
          }
          startPtt();
        });
      } catch (err) {
        console.warn('[IRONBOARD] PTT bind skipped:', err);
      }
    })();

    function applyProductMatrixHealth(payload) {
      var statusEl = document.getElementById('product-matrix-status');
      if (!payload || !payload.services) return;
      var up = 0;
      payload.services.forEach(function(row) {
        var card = document.querySelector('[data-matrix-key="' + row.key + '"]');
        if (!card) return;
        var dot = card.querySelector('[data-status-dot]');
        if (!dot) return;
        dot.classList.remove('status-unknown', 'status-up', 'status-down');
        if (row.reachable) {
          dot.classList.add('status-up');
          up += 1;
        } else {
          dot.classList.add('status-down');
        }
        var latency = row.latencyMs != null ? row.latencyMs + 'ms' : 'offline';
        var stage = row.crmStage ? ' · ' + row.crmStage : '';
        card.title = ':' + row.port + stage + ' · ' + (row.status || 'unreachable') + ' · ' + latency;
      });
      if (statusEl) {
        statusEl.textContent = up + '/' + payload.services.length + ' online · checked ' + (payload.checkedAt || '').replace('T', ' ').slice(0, 19);
      }
    }

    async function refreshProductMatrixHealth() {
      try {
        var response = await fetch(boardApiUrl('/api/product-matrix/health'), {
          cache: 'no-store',
          credentials: 'include',
        });
        if (!response.ok) {
          var statusEl = document.getElementById('product-matrix-status');
          if (statusEl) {
            statusEl.textContent = 'Fleet probe HTTP ' + response.status + ' — check ops console proxy / auth.';
          }
          return;
        }
        var payload = await response.json();
        applyProductMatrixHealth(payload);
      } catch (err) {
        console.warn('[IRONBOARD] Product matrix health probe failed:', err);
        var statusElFail = document.getElementById('product-matrix-status');
        if (statusElFail) statusElFail.textContent = 'Fleet probe failed — retry in 20s.';
      }
    }

    refreshProductMatrixHealth();
    setInterval(refreshProductMatrixHealth, 20000);

    hydrateChatHistory();
    renderChat();
    scrollChatToBottom();
  </script>
</body>
</html>`;
}

// ─── Express app ───────────────────────────────────────────────────────────────
const app = express();

// Raw body required for Resend/Svix webhook signature verification.
app.post(
  '/api/ingress/email',
  express.raw({ type: 'application/json' }),
  handleResendWebhookIngress,
);

app.use(express.json({ limit: '12mb' }));

app.post('/api/voice/transcribe', async (req, res) => {
  try {
    const key = getIronboardApiKey();
    if (!key?.trim()) {
      res.status(503).json({ error: 'GOOGLE_API_KEY_MISSING', transcript: '' });
      return;
    }
    const audioBase64 = String(req.body?.audioBase64 ?? '').trim();
    const mimeTypeRaw = String(req.body?.mimeType ?? 'audio/webm');
    const mimeType = mimeTypeRaw.split(';')[0].trim().toLowerCase() || 'audio/webm';
    if (audioBase64.length < 64) {
      res.status(400).json({ error: 'AUDIO_REQUIRED', transcript: '' });
      return;
    }
    // Cap ~9MB base64 to stay under the express JSON limit with margin.
    if (audioBase64.length > 9_000_000) {
      res.status(413).json({ error: 'AUDIO_TOO_LARGE', transcript: '' });
      return;
    }

    const ai = new GoogleGenAI({ apiKey: key });
    const model = getIronboardGeminiModel();
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                'Transcribe the spoken audio. Return ONLY the words spoken with normal punctuation. ' +
                'If nothing intelligible was said, return exactly EMPTY.',
            },
            { inlineData: { mimeType, data: audioBase64 } },
          ],
        },
      ],
      config: { temperature: 0, maxOutputTokens: 1024 },
    });
    let transcript = (response.text ?? '').trim();
    if (!transcript || /^empty$/i.test(transcript)) transcript = '';
    res.json({ transcript, model });
  } catch (err) {
    console.error('[IRONBOARD] voice transcribe failed', err);
    res.status(502).json({
      error: 'TRANSCRIBE_FAILED',
      detail: err instanceof Error ? err.message : 'transcribe failed',
      transcript: '',
    });
  }
});

app.get('/health', (_req, res) => {
  const key = getIronboardApiKey();
  res.json({
    status: 'HEALTHY',
    service: 'ironboard',
    port: PORT,
    geminiKeyPresent: Boolean(key?.trim()),
    geminiModel: getIronboardGeminiModel(),
    coreOriginConfigured: Boolean(
      process.env.IRONFRAME_CORE_ORIGIN?.trim() || process.env.IRONFRAME_MARKETING_ORIGIN?.trim(),
    ),
  });
});

app.get('/ready', async (_req, res) => {
  try {
    const snapshot = await buildIronboardReadiness({ probeGemini: true });
    res.status(snapshot.ready ? 200 : 503).json(snapshot);
  } catch (err) {
    console.error('[IRONBOARD] readiness probe failed', err);
    res.status(503).json({
      ready: false,
      error: err instanceof Error ? err.message : 'readiness probe failed',
    });
  }
});

app.get('/api/product-matrix/health', async (_req, res) => {
  try {
    const snapshot = await buildProductMatrixHealthSnapshot();
    res.json(snapshot);
  } catch (err) {
    console.error('[IRONBOARD] product-matrix health failed', err);
    res.status(500).json({ error: 'PRODUCT_MATRIX_HEALTH_FAILED' });
  }
});

app.get('/', (_req, res) => {
  res.set('Cache-Control', 'no-cache, must-revalidate');
  res.type('html').send(renderDashboard());
});

app.post('/api/query', async (req, res) => {
  const rawAgentId = String(req.body?.agentId ?? AUTO_ROUTER_ID).trim();

  if (BOARDROOM_ISOLATED_AGENT_IDS.has(rawAgentId)) {
    const ironframeRoute = BOARDROOM_ISOLATED_AGENT_REDIRECTS[rawAgentId] ?? "/api/agents/";
    res.status(403).json({
      error: 'DOCUMENTATION_AGENT_ISOLATED',
      message: `${rawAgentId} is isolated from the live boardroom. Use POST ${ironframeRoute} on Ironframe (:3000).`,
      isolatedAgent: rawAgentId,
      ironframeRoute,
    });
    return;
  }

  const agentId = resolveAgentId(rawAgentId);
  let history = normalizeHistory(req.body?.history);

  if (!agentId) {
    res.status(400).json({
      error: 'Invalid agentId. Must be "auto" or one of the live boardroom agent IDs.',
      validAgents: [...VALID_AGENT_IDS],
    });
    return;
  }

  if (history.length === 0) {
    res.status(400).json({ error: 'history must contain at least one message' });
    return;
  }

  const lastTurn = history[history.length - 1];
  if (lastTurn.role !== 'user') {
    res.status(400).json({ error: 'The last history turn must be a user message' });
    return;
  }

  const tenantId = String(req.body?.tenantId ?? '').trim() || undefined;

  let liveSystemTelemetryJson: string;
  try {
    const telemetry = await fetchIronframeSharedContext({
      incomingRequest: req,
      tenantId,
    });
    liveSystemTelemetryJson = telemetry.jsonBody;
  } catch (telemetryErr) {
    const detail =
      telemetryErr instanceof Error ? telemetryErr.message : 'Ironframe shared-context fetch failed';
    res.status(502).json({
      ok: false,
      error: CORE_TELEMETRY_DISCONNECTED,
      detail,
    });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  activeSseClients.add(res);

  let abort = { closed: false };
  res.on('close', () => {
    abort.closed = true;
    activeSseClients.delete(res);
  });

  writeSseToolCall(res, {
    name: 'coreTelemetryBridge',
    status: 'complete',
    ok: true,
    prefetch: true,
    bytes: liveSystemTelemetryJson.length,
  });

  writeSseToolCall(res, {
    name: 'linkScraper',
    status: 'running',
    prefetch: true,
  });

  let linkScraperEnrichment = '';
  let linkScraperTraceId = '';
  let linkScraperOk = false;
  let linkScraperTelemetryVerified = false;
  let linkScraperBlocksExtractedUnits = '0';
  let linkScraperCrmInteractionId: string | null = null;
  try {
    const linkScrape = await interceptBoardroomLinkPayload({
      history,
      requestBody: req.body,
      tenantId,
    });
    history = linkScrape.history;
    linkScraperEnrichment = linkScrape.enrichment;
    linkScraperTraceId = linkScrape.traceId;
    linkScraperOk = linkScrape.matches.length === 0 || linkScrape.ingests.length > 0;
    linkScraperTelemetryVerified = linkScrape.telemetryVerified;
    linkScraperBlocksExtractedUnits = linkScrape.verifiedBlocksExtractedUnits.toString();
    linkScraperCrmInteractionId = linkScrape.crmTelemetryInteractionId;
    writeSseToolCall(res, {
      name: 'linkScraper',
      status: 'complete',
      ok: linkScraperOk,
      prefetch: true,
      linksMatchedUnits: linkScrape.telemetry.linksMatchedUnits.toString(),
      blocksExtractedUnits: linkScraperBlocksExtractedUnits,
      telemetryVerified: linkScraperTelemetryVerified,
      traceId: linkScraperTraceId,
      routingHeldMs: linkScrape.routingHeldMs,
    });
    writeSseEvent(res, {
      orchestration: {
        linkScraper: 'complete',
        traceId: linkScraperTraceId,
        telemetryVerified: linkScraperTelemetryVerified,
        blocksExtractedUnits: linkScraperBlocksExtractedUnits,
        preRoutingValidation: linkScrape.matches.length > 0 && !linkScraperTelemetryVerified ? 'FAILED' : 'PASSED',
      },
    });
  } catch (linkErr) {
    console.warn('[IRONBOARD LINK SCRAPER]', linkErr);
    writeSseToolCall(res, {
      name: 'linkScraper',
      status: 'complete',
      ok: false,
      prefetch: true,
      error: linkErr instanceof Error ? linkErr.message : 'link scraper failed',
    });
    writeSseEvent(res, {
      orchestration: {
        linkScraper: 'complete',
        preRoutingValidation: 'FAILED',
      },
    });
  }

  const query = lastUserTurnText(history);
  const videoTimelineActive = resolveVideoTimelineActiveFromPayload({
    history,
    query,
    requestBody: req.body,
    linkScraperEnrichment,
  });

  const key = getIronboardApiKey();
  if (!key) {
    writeSseToken(res, 'GOOGLE_API_KEY missing. Set it in Ironboard/.env and restart.');
    res.end();
    return;
  }

  try {
    const planeHeader = String(req.headers['x-ironframe-conversation-plane'] ?? '').trim();
    if (planeHeader && !isBoardroomConversationPlane(planeHeader)) {
      writeSseToken(
        res,
        'Conversation plane mismatch: this endpoint serves the IronBoard 17-agent boardroom only. Use sovereign orchestration APIs for the 19-agent GRC core.',
      );
      res.end();
      return;
    }

    const routed = routeExecutivePanel(query, agentId, {
      linkScraperComplete: true,
      linkScraperOk,
      linkScraperTraceId,
      videoTimelineInjected: videoTimelineActive,
      telemetryVerified: linkScraperTelemetryVerified,
      blocksExtractedUnits: linkScraperBlocksExtractedUnits,
      crmTelemetryInteractionId: linkScraperCrmInteractionId,
      preRoutingValidation:
        linkScraperTraceId && linkScraperBlocksExtractedUnits !== '0'
          ? linkScraperTelemetryVerified
            ? 'PASSED'
            : 'FAILED'
          : 'SKIPPED',
    });

    const canonicalResponse = resolveCanonicalBoardResponse(query);
    if (canonicalResponse) {
      writeSseToken(res, canonicalResponse);
      res.end();
      return;
    }

    const leader = routed.leader;
    const activeHub = String(req.body?.activeHub ?? '').trim();
    const selectedProspectId = String(req.body?.selectedProspectId ?? '').trim();
    let flywheelContext: string | null = null;
    try {
      flywheelContext = await buildFlywheelWorkspaceContext(activeHub, selectedProspectId || undefined);
    } catch (flywheelErr) {
      console.warn('[IRONBOARD FLYWHEEL CONTEXT]', flywheelErr);
    }

    const ai = new GoogleGenAI({ apiKey: key });
    const model = getIronboardGeminiModel();

    const { prefetchedExchange, systemEnrichment, receipts, marketResults, workspaceSnapshot } =
      await prefetchBoardroomGroundTruth({
      ai,
      model,
      query,
      activeHub,
      tenantId,
      prospectId: selectedProspectId || undefined,
      res,
      linkScraperEnrichment,
    });

    const gtmMarketQuery = isGtmMarketQuery(query);
    const competitivePositioningQuery = isCompetitivePositioningQuery(query);

    const toolMode = resolveBoardroomToolMode(model, query, {
      hasWorkspacePrefetch: prefetchedExchange.length > 0,
    });

    if (requiresCrmDiscovery(query)) {
      const crmDetermination = synthesizeCrmCapabilityFromDiscovery(query, receipts);
      if (crmDetermination) {
        writeSseToken(res, crmDetermination);
        res.end();
        return;
      }
    }

    if (isMarketResearchCapabilityQuery(query)) {
      const marketDetermination = synthesizeMarketResearchBoardResponse(query, {
        marketResults,
        workspaceSnapshot,
      });
      if (marketDetermination) {
        writeSseToken(res, marketDetermination);
        res.end();
        return;
      }
    }

    if (isPlaybookInventoryQuery(query)) {
      const playbookDetermination = synthesizePlaybookInventoryFromDiscovery(receipts);
      if (playbookDetermination) {
        writeSseToken(res, playbookDetermination);
        res.end();
        return;
      }
    }

    const systemInstruction = [
      buildSystemInstruction(
        leader,
        flywheelContext,
        history,
        query,
        linkScraperEnrichment,
        req.body,
        liveSystemTelemetryJson,
      ),
      formatMarketEntryReadinessEnrichment(
        parseMarketEntryReadinessFromTelemetry(liveSystemTelemetryJson),
      ),
      systemEnrichment,
      prefetchedExchange.length
        ? 'Discovery and workspace tools have ALREADY executed — functionResponse payloads are in the conversation history above. Synthesize strictly from those receipts. Never claim tools or live data are unavailable.'
        : '',
      systemEnrichment.includes('LIVE WEB GROUND TRUTH')
        ? 'Live web search results are in the system context above — use them for time, news, and global facts. Never claim real-time or external data is unavailable.'
        : '',
      routed.orchestrationReceipt.videoTimelineInjected
        ? `ORCHESTRATION RECEIPT: linkScraper complete (traceId=${routed.orchestrationReceipt.linkScraperTraceId}, blocksExtractedUnits=${routed.orchestrationReceipt.blocksExtractedUnits}, telemetryVerified=${routed.orchestrationReceipt.telemetryVerified}).`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const streamConfig = buildBoardroomStreamConfig(model, systemInstruction, toolMode, videoTimelineActive);

    await runBoardroomToolStream({
      ai,
      res,
      abort,
      model,
      history,
      config: streamConfig,
      prefetchedExchange,
      sanitizeDenials:
        videoTimelineActive ||
        gtmMarketQuery ||
        competitivePositioningQuery ||
        shouldPrefetchProspects(query),
      gtmMarketQuery,
      competitivePositioningQuery,
    });
  } catch (err) {
    const fault = classifyGeminiStreamFault(err);
    console.error(`[IRONBOARD STREAM] kind=${fault.kind}`, fault.logDetail, err);
    if (!res.writableEnded) {
      writeSseToken(res, fault.operatorMessage);
    }
  } finally {
    if (!res.writableEnded) res.end();
  }
});


app.get('/api/prospects', async (req, res) => {
  const regionsRaw = String(req.query.regions ?? req.query.region ?? '').trim();
  try {
    const regions = regionsRaw ? parseTargetCountriesInput(regionsRaw) : [];
    const prospects =
      regions.length > 0 ? await listProspectsInRegions(regions) : await listProspects();
    res.json({ regions: regions.length ? regions : null, prospects });
  } catch (err) {
    console.error('[IRONBOARD PROSPECTS LIST]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Prospect query failed' });
  }
});

app.post('/api/prospects/trigger', async (req, res) => {
  const targetCountries = Array.isArray(req.body?.targetCountries)
    ? req.body.targetCountries.map((v: unknown) => String(v).trim()).filter(Boolean)
    : undefined;
  const regions = Array.isArray(req.body?.regions)
    ? req.body.regions.map((v: unknown) => String(v).trim()).filter(Boolean)
    : undefined;
  const region = String(req.body?.region ?? '').trim();
  const account = req.body?.account;
  try {
    const prospects = await triggerProspectIngest({
      targetCountries,
      regions,
      region: region || undefined,
      account: account && typeof account === 'object' ? account : undefined,
    });
    const resolvedTargets =
      targetCountries?.length
        ? targetCountries
        : regions?.length
          ? regions
          : region
            ? parseTargetCountriesInput(region)
            : [];
    res.json({
      targetCountries: resolvedTargets.length ? resolvedTargets : null,
      prospects,
    });
  } catch (err) {
    console.error('[IRONBOARD PROSPECTS TRIGGER]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Prospect trigger failed' });
  }
});

app.post('/api/prospects/signal', async (req, res) => {
  const domain = String(req.body?.domain ?? '').trim();
  const responseText = String(req.body?.responseText ?? '');
  const isPositive = Boolean(req.body?.isPositive);
  if (!domain) {
    res.status(400).json({ error: 'domain is required' });
    return;
  }
  try {
    const result = await harvestInteractionSignal(domain, responseText, isPositive);
    res.json(result);
  } catch (err) {
    console.error('[IRONBOARD PROSPECTS SIGNAL]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Signal harvest failed' });
  }
});

/** Legacy aliases — dashboard pitch pane still uses /api/market/pitch */
app.get('/api/market/prospects', async (req, res) => {
  const regionsRaw = String(req.query.regions ?? req.query.region ?? '').trim();
  try {
    const regions = regionsRaw ? parseTargetCountriesInput(regionsRaw) : [];
    const prospects =
      regions.length > 0 ? await listProspectsInRegions(regions) : await listProspects();
    res.json({ prospects });
  } catch (err) {
    console.error('[IRONBOARD MARKET PROSPECTS]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Prospect query failed' });
  }
});

app.post('/api/market/batch', async (req, res) => {
  const targetCountries = Array.isArray(req.body?.targetCountries)
    ? req.body.targetCountries.map((v: unknown) => String(v).trim()).filter(Boolean)
    : undefined;
  const region = String(req.body?.region ?? '').trim();
  const regions = targetCountries?.length
    ? targetCountries
    : region
      ? parseTargetCountriesInput(region)
      : [];
  if (!regions.length) {
    res.status(400).json({ error: 'targetCountries or region is required.' });
    return;
  }
  try {
    const prospects = await fetchProspectingBatchForTargets(regions);
    res.json({ targetCountries: regions, prospects });
  } catch (err) {
    console.error('[IRONBOARD MARKET BATCH]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Batch ingest failed' });
  }
});

app.post('/api/market/pitch', async (req, res) => {
  const domain = String(req.body?.domain ?? '').trim();
  if (!domain) {
    res.status(400).json({ error: 'domain is required' });
    return;
  }
  try {
    const pitch = await generateGroundedPitch(domain);
    const prospect = await findProspectByDomain(domain);
    res.json({
      domain,
      pitch,
      compliancePressure: prospect?.compliancePressure ?? '',
    });
  } catch (err) {
    console.error('[IRONBOARD MARKET PITCH]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Pitch generation failed' });
  }
});

app.post('/api/market/harvest', async (req, res) => {
  const domain = String(req.body?.domain ?? '').trim();
  const responseText = String(req.body?.responseText ?? '');
  const isPositive = Boolean(req.body?.isPositive);
  if (!domain) {
    res.status(400).json({ error: 'domain is required' });
    return;
  }
  try {
    const result = await harvestInteractionSignal(domain, responseText, isPositive);
    res.json(result);
  } catch (err) {
    console.error('[IRONBOARD MARKET HARVEST]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Signal harvest failed' });
  }
});

app.post('/api/ingress/video', handleVideoIngress);

/**
 * One-way documentation pipeline — Ironframe shared-context brief → board-trainer → board-writer.
 */
app.post('/api/documentation/execute', async (req, res) => {
  try {
    const tenantId =
      typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : undefined;
    const result = await runDocumentationAuthoringPipeline(req, tenantId);
    if (!result.ok) {
      res.status(502).json({
        ok: false,
        error: 'DOCUMENTATION_BRIEF_INGRESS_FAILED',
        detail: result.error ?? 'Unknown ingress fault',
      });
      return;
    }
    res.json({
      ok: true,
      release: result.brief?.release,
      posture: result.brief?.posture,
      communicationDirection: result.brief?.communicationDirection,
      documentationArtifacts: result.documentationArtifacts,
      executiveSummaryLog: result.executiveSummaryLog,
    });
  } catch (err) {
    console.error('[IRONBOARD DOCUMENTATION PIPELINE]', err);
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Documentation pipeline failed',
    });
  }
});

/** The Governance Frame — chronological markdown briefings (published ledger only). */
app.use('/governance-frame', createGovernanceFrameRouter());

app.use((_req, res) => {
  res.status(404).json({ status: 'NOT_FOUND' });
});

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`[IRONBOARD ENGINE] Live at http://0.0.0.0:${PORT}/`);
  console.log(`[IRONBOARD ENGINE] 17-agent boardroom online · Gemini: ${getIronboardApiKey() ? 'ready' : 'offline'}`);
  console.log(`[IRONBOARD ENGINE] Stop: Ctrl+C (or npm run stop if port 8082 sticks)`);
  const published = scanPublishedBriefings(resolveDocsRoot());
  console.log(
    `[GOVERNANCE FRAME] Briefing feed at http://127.0.0.1:${PORT}/governance-frame · published=${published.length}`,
  );
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[IRONBOARD] Port ${PORT} in use. Try: $env:PORT=8083; npx tsx src/index.ts`);
    process.exit(1);
  }
  throw err;
});

let shuttingDown = false;

function installWindowsCtrlCHandler(): void {
  if (!process.stdin.isTTY) return;
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.on('SIGINT', () => {
    void shutdownBoard('SIGINT (readline)');
  });
}

async function shutdownBoard(signal: string): Promise<void> {
  if (shuttingDown) {
    process.exit(1);
    return;
  }
  shuttingDown = true;
  console.log(`\n[IRONBOARD] ${signal} — shutting down...`);

  for (const client of activeSseClients) {
    try {
      const socket = client.socket;
      if (socket && !socket.destroyed) {
        socket.destroy();
      }
      if (!client.writableEnded) {
        client.end();
      }
    } catch {
      /* connection may already be closed */
    }
  }
  activeSseClients.clear();

  try {
    if (typeof server.closeAllConnections === 'function') {
      server.closeAllConnections();
    }
  } catch {
    /* best-effort */
  }

  try {
    const { disconnectPrisma } = await import('./services/prisma.js');
    await disconnectPrisma();
  } catch {
    /* optional when DATABASE_URL unset */
  }

  try {
    server.close();
  } catch {
    /* best-effort */
  }

  process.exit(0);
}

installWindowsCtrlCHandler();
process.on('SIGINT', () => {
  void shutdownBoard('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdownBoard('SIGTERM');
});
if (process.platform === 'win32') {
  process.on('SIGBREAK', () => {
    void shutdownBoard('SIGBREAK');
  });
}

