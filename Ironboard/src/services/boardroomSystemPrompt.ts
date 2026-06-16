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
import { formatLiveSystemTelemetryBlock } from './coreTelemetryBridge.js';

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
    priorityBlocks.push(formatLiveSystemTelemetryBlock(input.liveSystemTelemetryJson));
    priorityBlocks.push(
      'The [LIVE SYSTEM TELEMETRY - ARCHITECTURE ENFORCED] block is authoritative Ironframe core telemetry (ALE cents, threats, compliance, sustainability). Never claim live workforce data is unavailable when this block is present.',
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
