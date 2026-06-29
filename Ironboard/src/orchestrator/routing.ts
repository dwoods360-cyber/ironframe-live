import type { BoardPersona } from '../staticContext.js';
import {
  GRC_ANALYST_DAY_VIDEO_TITLE,
  GRC_ANALYST_DAY_VIDEO_TRANSCRIPT,
  isGrcAnalystDayVideoReference,
  isKnownGrcAnalystVideoId,
} from '../knowledge/grcAnalystDayVideoSeed.js';
import { scanStreamingMediaUrls } from '../middleware/linkScraper.js';
import { LINK_SCRAPER_VIDEO_TIMELINE_TAG, payloadSignalsVideoIntelligence } from '../services/boardResponseLibrary.js';
import { IRONBOARD_DOMAIN_BOUNDARY } from './platformApplicationBoundary.js';

/** IronBoard (:8082) vs Ironframe (:3000) — constitutional zero cross-contamination boundary. */
export { IRONBOARD_DOMAIN_BOUNDARY } from './platformApplicationBoundary.js';
/** Legacy alias — conversation plane lock includes domain boundary text. */
export const BOARD_CONVERSATIONAL_BOUNDARY = IRONBOARD_DOMAIN_BOUNDARY;

export const BOARD_CRM_TOOL_MANDATE = `
CRM / SALES / DATA CAPABILITY RULE (NON-NEGOTIABLE):
When asked about CRM, sales, playbooks, pipelines, contacts, or data capabilities, you are strictly forbidden from guessing or answering from prose memory alone.
You MUST actively execute workspace tools — especially manageCrmPipeline (list_sales_playbooks, list_pipeline) and queryLocalWorkspace — to query live schemas before any capability claim.
If these modules return ok=true in the active tree, report them as active IronBoard platform capabilities even when record counts are zero.
Never respond that Ironframe "is not a CRM" or "does not offer contact management" when tool receipts prove manageCrmPipeline is reachable.
`.trim();

export const BOARD_VIDEO_INTELLIGENCE_MANDATE = `
VIDEO INTELLIGENCE RULE (NON-NEGOTIABLE):
IronBoard exposes POST /api/ingress/video (Irongate Agent 14 DMZ) and pre-fetches VIDEO INTELLIGENCE rows into ironboard_crm_interactions (metricTag=video_intelligence).
When the incoming payload contains ${LINK_SCRAPER_VIDEO_TIMELINE_TAG}, you MUST treat the appended [LINK SCRAPER] timeline as primary evidence.
You are strictly forbidden from responding that you "cannot watch", "cannot analyze", "cannot process video content", or "are unable to directly view" video links when that tag is present.
`.trim();

/** Board must respond as the platform execution layer — no AI disclaimers. */
export const BOARD_EXECUTION_LAYER_PERSONA = `
RESPONSE PLANE (NON-NEGOTIABLE):
You are the IronBoard platform execution layer — the boardroom orchestration engine on port 8082. Respond directly as the operational policy and CRM execution surface.
NEVER begin responses with "While I, as an AI, do not personally..." or similar disclaimers.
NEVER use first-person AI limitation language ("As an AI...", "I don't personally...", "I do not personally...", "I cannot personally...", "I am not capable of performing real market research").
When asked for market research or GTM prospect discovery, execute and report tool-backed findings — never refuse by contrasting "information retrieval" with "real market research".
`.trim();

export const CANONICAL_SALES_LEADS_RESPONSE =
  'Ironboard does not autonomously crawl external networks for passive lead generation. Instead, Ironboard executes operational lead discovery and pipeline management through its embedded, tenant-isolated CRM engine (`manageCrmPipeline`). The platform structures incoming B2B contact records (`B2BContact`), tracks stage progression vectors (`DealRecord`), and applies the strategic parameters of our sales methodology corpus (The Challenger Sale / SPIN Selling) to actively progress enterprise accounts within this tenant partition. All core security, threat isolation, and technical compliance parameters are offloaded to Ironframe.';

export function isGrcVideoBriefingQuery(query: string): boolean {
  if (!payloadSignalsVideoIntelligence(query)) return false;
  if (isGrcAnalystDayVideoReference(query)) return true;
  return scanStreamingMediaUrls(query).some(match => isKnownGrcAnalystVideoId(match.videoId));
}

export function buildCanonicalGrcVideoBriefingResponse(): string {
  const timedFindings = GRC_ANALYST_DAY_VIDEO_TRANSCRIPT.map(
    cue =>
      `[${String(Math.floor((cue.startMs ?? 0) / 1000)).padStart(2, '0')}s] ${cue.speaker}: ${cue.text}`,
  );

  return [
    `I have analyzed "${GRC_ANALYST_DAY_VIDEO_TITLE}" from the pre-processed VIDEO INTELLIGENCE timeline (YouTube watch?v=t7nPZ5OwUFY).`,
    'The briefing surfaces manual workflows, communication barriers, and tracking challenges that informed Ironframe automation goals:',
    ...timedFindings.map(line => `- ${line}`),
    'Ironframe\'s 19-agent autonomous workforce and immutable audit ledger are engineered to resolve these friction points — cross-SaaS reconciliation, LP-10 config churn visibility, LP-16 meta-audit rows, tenant-scoped evidence vaults, and board packets with immutable Ironscribe export hashes — so GRC analysts spend less time re-keying spreadsheets and more time on strategic problem-solving.',
  ].join('\n');
}

export function isSalesLeadDiscoveryQuery(query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.includes('do you actively look for sales leads')) return true;
  if (q.includes('actively look for sales lead')) return true;
  if (
    (q.includes('sales lead') || q.includes('sales leads')) &&
    (q.includes('actively') || q.includes('autonom') || q.includes('crawl') || q.includes('look for'))
  ) {
    return true;
  }
  if (q.includes('look for') && q.includes('lead') && (q.includes('do you') || q.includes('actively'))) {
    return true;
  }
  return false;
}

/** Deterministic canonical responses — bypass LLM synthesis when matched. */
export function resolveCanonicalBoardResponse(query: string): string | null {
  if (isGrcVideoBriefingQuery(query)) {
    return buildCanonicalGrcVideoBriefingResponse();
  }
  if (isSalesLeadDiscoveryQuery(query)) {
    return CANONICAL_SALES_LEADS_RESPONSE;
  }
  return null;
}

export function buildBoardroomPersonaPrompt(leader: BoardPersona): string {
  return [
    `You are ${leader.role} (${leader.id}) on the IronBoard 17-agent executive panel — NOT the Ironframe 19-agent GRC workforce.`,
    `Primary framework: ${leader.primaryBookAlignment}.`,
    `Expertise: ${leader.expertise.join(', ')}.`,
    'Respond in 2–3 dense sentences of fluent prose unless listing tool-verified playbook inventories. No markdown lists unless enumerating discovery tool results.',
  ].join('\n');
}
