import type { BoardPersona } from '../staticContext.js';
import {
  BOARD_CONVERSATIONAL_BOUNDARY,
  BOARD_CRM_TOOL_MANDATE,
  BOARD_EXECUTION_LAYER_PERSONA,
  BOARD_VIDEO_INTELLIGENCE_MANDATE,
  buildBoardroomPersonaPrompt,
} from '../orchestrator/routing.js';
import {
  LINK_SCRAPER_VIDEO_TIMELINE_TAG,
  payloadContainsLinkScraperVideoTimeline,
  prependVideoIntelligenceSystemOverride,
  resolveVideoTimelineActiveFromPayload,
  stripVideoAccessDenialPromptRules,
  VIDEO_INTELLIGENCE_DATA_OVERRIDE,
} from './boardResponseLibrary.js';

export type BoardroomSystemPromptInput = {
  leader: BoardPersona;
  staticContext: string;
  docsFederation: string;
  boardroomDirective: string;
  workforceDisambiguation: string;
  flywheelContext?: string | null;
  history: Array<{ role: string; text: string }>;
  query: string;
  requestBody?: unknown;
  linkScraperEnrichment?: string;
  /** Raw JSON from GET /api/board/shared-context — injected before LLM synthesis. */
  liveSystemTelemetryJson?: string;
};

/**
 * Unified hardened governance layers: unidirectional diode, live telemetry hydration,
 * de-classification matrix, Governance Frame triad, and executive persona ratios.
 */
export function buildHardenedGovernanceLayers(telemetryJsonString: string): string {
  return `
You are the collective 17-Agent Executive IronBoard Boardroom running on port 8082.
You possess full visibility into live technical telemetry but operate as a strictly unidirectional advisory plane.

[LAYER 1: UNIDIRECTIONAL DIODE POSTURE]
- You are a READ-ONLY system. You have zero write permissions to the underlying database or port 3000.
- Do not attempt to formulate code commands, mock database writes, or simulate system overrides.
- Your sole mandate is to analyze live telemetry and advise the human operator. The human operator holds the exclusive execution keys.

[LAYER 2: LIVE METRIC HYDRATION - ARCHITECTURE ENFORCED]
The following JSON string is the absolute source of truth pulled directly from the Ironframe production cache:
${telemetryJsonString.trim()}

[LAYER 3: THE DE-CLASSIFICATION MATRIX]
When compiling ANY response, executive summary, briefing, or public newsletter intended for the Governance Frame Hub (brief.ironframegrc.com), you must aggressively sanitize the data:
1. CURRENCY SERIALIZATION: Never output raw internal BigInt cent integers. Cite `financials.display.sovereignPool.*.baselineFormatted` and `currentExposureFormatted` strings verbatim — they are pre-computed by Ironframe and must not be reformatted.
2. VULNERABILITY HIDING: Do not output raw CVE identifiers, active exploit pathways, or specific unpatched database asset IDs. Translate threats into system-level perimeter descriptions.
3. SUSTAINABILITY CAPTURE: Cite `financials.display.sustainability.powerUsageFormatted` and `fluidConsumptionFormatted` exactly as provided.

[LAYER 4: MANDATORY GOVERNANCE FRAME TRIAD]
You are strictly prohibited from using generic marketing blocks or bullet lists for public briefings. Use the fixed headings in `financials.display.governanceTriadScaffold` and structure content under:

- EXPOSURE VECTOR: Outline the macro perimeter domain being evaluated (e.g., Grid Ingress Invariants, Third-Party Processing Paths).
- IMPACT: Articulate the absolute protection of our baselines using sanitized macro-financials and physical sustainability metrics.
- REMEDIATION: Detail the continuous verification loops, the Immutable Audit Ledger logging, and the mandatory human-in-the-loop validation gate.

[LAYER 5: EXECUTIVE PERSONA EXECUTION RATIOS]
- Chief of Staff (board-bot) & CFO (board-cfo): Anchor financial exposure assertions strictly in macro-sanitized USD metrics.
- Narrative Architect (board-writer): Draft the core text using clear, un-exploitable prose.
- Compliance Officer (board-compliance): Validate all text against DORA compliance mandates.
`.trim();
}

export function buildBoardroomSystemInstruction(input: BoardroomSystemPromptInput): string {
  const videoTimelineActive = resolveVideoTimelineActiveFromPayload({
    history: input.history,
    query: input.query,
    requestBody: input.requestBody,
    linkScraperEnrichment: input.linkScraperEnrichment,
  });

  const hasInjectedTimeline =
    payloadContainsLinkScraperVideoTimeline(input.query) ||
    input.history.some(turn => payloadContainsLinkScraperVideoTimeline(turn.text)) ||
    Boolean(input.linkScraperEnrichment?.includes(LINK_SCRAPER_VIDEO_TIMELINE_TAG));

  const priorityBlocks: string[] = [];
  if (input.liveSystemTelemetryJson?.trim()) {
    priorityBlocks.push(buildHardenedGovernanceLayers(input.liveSystemTelemetryJson));
    priorityBlocks.push(
      'The [LAYER 2: LIVE METRIC HYDRATION] JSON block is authoritative Ironframe core telemetry. Cite `financials.display` formatted strings verbatim — never recompute currency from raw cent integers.',
    );
  }
  if (videoTimelineActive) {
    priorityBlocks.push(VIDEO_INTELLIGENCE_DATA_OVERRIDE);
    priorityBlocks.push(BOARD_VIDEO_INTELLIGENCE_MANDATE);
    if (hasInjectedTimeline) {
      priorityBlocks.push(
        `Incoming payload contains ${LINK_SCRAPER_VIDEO_TIMELINE_TAG}. The [LINK SCRAPER] timeline appended to the user message is authoritative primary evidence.`,
      );
    } else {
      priorityBlocks.push(
        'Incoming payload references a YouTube or GRC analyst video briefing. Pre-processed video intelligence timelines and link-scraper enrichment in this system context are authoritative primary evidence — synthesize from timed blocks; never claim inability to analyze video content.',
      );
    }
    if (input.linkScraperEnrichment?.trim()) {
      priorityBlocks.push(input.linkScraperEnrichment.trim());
    }
  }

  const blocks = [
    ...priorityBlocks,
    BOARD_EXECUTION_LAYER_PERSONA,
    BOARD_CONVERSATIONAL_BOUNDARY,
    BOARD_CRM_TOOL_MANDATE,
    input.flywheelContext?.trim() || '',
    stripVideoAccessDenialPromptRules(input.boardroomDirective),
    stripVideoAccessDenialPromptRules(input.workforceDisambiguation),
    buildBoardroomPersonaPrompt(input.leader),
    stripVideoAccessDenialPromptRules(input.staticContext),
    stripVideoAccessDenialPromptRules(input.docsFederation),
  ].filter(Boolean);

  return prependVideoIntelligenceSystemOverride(blocks.join('\n\n'), videoTimelineActive);
}

export { resolveVideoTimelineActiveFromPayload };
