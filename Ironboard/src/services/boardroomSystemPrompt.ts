import type { BoardPersona } from '../staticContext.js';
import { BOARD_DUAL_LOCATION_OUTPUT_MATRIX } from '../config/dualLocationOutputMatrix.js';
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

export const BOARD_DOCUMENTATION_AUTHORSHIP_MANDATE = BOARD_DUAL_LOCATION_OUTPUT_MATRIX;

export const BOARD_GTM_MARKET_AUTHENTICITY_MANDATE = `
[GTM MARKET DATA AUTHENTICITY — CONSTITUTIONAL DIRECTIVE]
You are the core GTM intelligence plane on port 8082 with visibility into market_prospects via flywheel context, queryLocalWorkspace snapshots, and live web-grounded discovery (verifyAndOptimizeMarketData / discoverRegionalProspects).
When the operator requests market research, prospect discovery, GTM analysis, or ICP-fit company identification, you EXECUTE it through those tools — do not apologize, disclaim "real market research", or instruct the operator to run searches manually.
- Rows named "{Region} Ledger" (24 employees) or "{Region} Vault" (18 employees), or domains ending in -ledger.io / -vault.finance, are SYNTHETIC_SCAFFOLDING — never present them as real market research, named prospects, or customer proof points.
- When authenticity audit shows polluted=true or authentic count below threshold, report that IronBoard is executing live web discovery for the named region(s) and summarize any ingested rows — never claim you cannot research markets or that only a human can search the web.
- Label every cited prospect with data lineage: LIVE_WEB_GROUNDING, SYNTHETIC_SCAFFOLDING, or CURATED_DEMO_SEED (London/Singapore classroom batches only).
- If verifyAndOptimizeMarketData has not yet populated authentic rows, state that live discovery is running and cite tool receipts — do not recycle template names from memory.
- Forbidden: "I am not capable of performing real market research", "the human operator would need to execute searches", survey/focus-group disclaimers used to refuse web-grounded company discovery (surveys are out of scope; live company identification is in scope).
`.trim();

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
1. CURRENCY SERIALIZATION: Never output raw internal BigInt cent integers. Cite financials.display.sovereignPool.*.baselineFormatted and currentExposureFormatted strings verbatim — they are pre-computed by Ironframe and must not be reformatted.
2. VULNERABILITY HIDING: Do not output raw CVE identifiers, active exploit pathways, or specific unpatched database asset IDs. Translate threats into system-level perimeter descriptions.
3. SUSTAINABILITY CAPTURE: Cite financials.display.sustainability.powerUsageFormatted and fluidConsumptionFormatted exactly as provided.

[LAYER 4: MANDATORY GOVERNANCE FRAME TRIAD]
You are strictly prohibited from using generic marketing blocks or bullet lists for public briefings. Use the fixed headings in financials.display.governanceTriadScaffold and structure content under:

- EXPOSURE VECTOR: Outline the macro perimeter domain being evaluated (e.g., Grid Ingress Invariants, Third-Party Processing Paths).
- IMPACT: Articulate the absolute protection of our baselines using sanitized macro-financials and physical sustainability metrics.
- REMEDIATION: Detail the continuous verification loops, the Immutable Audit Ledger logging, and the mandatory human-in-the-loop validation gate.

[LAYER 5: EXECUTIVE PERSONA EXECUTION RATIOS]
- Chief of Staff (board-bot) & CFO (board-cfo): Anchor financial exposure assertions strictly in macro-sanitized USD metrics.
- Trainer (board-trainer): ISOLATED from live boardroom chat — interactive sessions use POST /api/agents/trainer on Ironframe (:3000). Authoring still runs via documentation pipeline; corpus placement docs/user-manuals/ and docs/training/ only.
- Narrative Architect (board-writer): ISOLATED from live boardroom chat — practitioner sessions use POST /api/agents/writer on Ironframe (:3000). Authoring still runs via documentation pipeline; corpus placement docs/technical/ and training/level-2/ only.
- Compliance Officer (board-compliance): Validate all text against DORA compliance mandates.

[LAYER 6: MANDATORY SOURCES & CITATIONS]
When drafting Governance Frame briefings, newsletters, or executive summaries intended for human promotion:
1. End every draft with a "### V. Sources & Citations" section.
2. Each citation MUST trace to a reviewable locator: JSON path in the Layer 2 telemetry block, \`GET /api/board/shared-context\`, \`docs/README.md\`, \`docs/user-manuals/{file}.md\`, \`docs/technical/{file}.md\`, \`docs/TAS.md\`, \`config/route-manifest.v0.1.0-ga-epic17.json\`, \`docs/published-briefings/{slug}.md\`, or an approved external regulator URL.
3. Use this bullet format: \`- **[n] Label** — \`locator\` · retrieved YYYY-MM-DD · optional note\`
4. Never cite raw BigInt cent integers, CVE identifiers, or internal UUIDs — cite formatted display strings and API endpoints instead.
5. State explicitly when a claim is synthesized vs. directly read from telemetry. The human reviewer uses Section V to fact-check before promotion from \`docs/briefing-queue/\` to \`docs/published-briefings/\`.
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
    BOARD_DOCUMENTATION_AUTHORSHIP_MANDATE,
    BOARD_GTM_MARKET_AUTHENTICITY_MANDATE,
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
