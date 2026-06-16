import { describe, expect, it } from 'vitest';
import {
  VIDEO_INTELLIGENCE_DATA_OVERRIDE,
  LINK_SCRAPER_VIDEO_TIMELINE_TAG,
  payloadContainsLinkScraperVideoTimeline,
  resolveVideoTimelineActiveFromPayload,
  stripCapabilityDenialFallbacks,
  stripVideoAccessDenialPromptRules,
  buildToolExecutionDirective,
} from '../../Ironboard/src/services/boardResponseLibrary.ts';
import { buildBoardroomSystemInstruction } from '../../Ironboard/src/services/boardroomSystemPrompt.ts';
import {
  CANONICAL_SALES_LEADS_RESPONSE,
  buildCanonicalGrcVideoBriefingResponse,
  IRONBOARD_DOMAIN_BOUNDARY,
  isGrcVideoBriefingQuery,
  isSalesLeadDiscoveryQuery,
  resolveCanonicalBoardResponse,
} from '../../Ironboard/src/orchestrator/routing.ts';
import { AGENTIC_BOARD_ROSTER } from '../../Ironboard/src/staticContext.ts';

describe('boardResponseLibrary', () => {
  it('prepends DATA OVERRIDE when video timeline middleware tag is present', () => {
    const directive = buildToolExecutionDirective(true);
    expect(directive.startsWith(VIDEO_INTELLIGENCE_DATA_OVERRIDE)).toBe(true);
  });

  it('strips capability denial fallback sentences', () => {
    const raw =
      'As an AI, I am unable to directly process video content. Ironframe automates GRC workflows.';
    const cleaned = stripCapabilityDenialFallbacks(raw);
    expect(cleaned).not.toMatch(/unable to/i);
    expect(cleaned).toContain('Ironframe automates GRC workflows.');
  });

  it('strips "While I, as an AI, do not personally..." disclaimers', () => {
    const raw =
      'While I, as an AI, do not personally crawl networks for leads. Ironboard executes CRM pipeline management via manageCrmPipeline.';
    const cleaned = stripCapabilityDenialFallbacks(raw);
    expect(cleaned).not.toMatch(/as an ai/i);
    expect(cleaned).not.toMatch(/do not personally/i);
    expect(cleaned).toContain('Ironboard executes CRM pipeline management');
  });

  it('strips "As an AI, I cannot directly access or analyze video content" board denials', () => {
    const raw =
      'I acknowledge the YouTube link to "Cybersecurity Reality: A Day in the Life of a GRC Analyst." As an AI, I cannot directly access or analyze video content. I understand this video provides valuable context for the board regarding the GRC challenges that Ironframe is designed to automate.';
    const cleaned = stripCapabilityDenialFallbacks(raw);
    expect(cleaned).not.toMatch(/as an ai/i);
    expect(cleaned).not.toMatch(/cannot directly access or analyze/i);
    expect(cleaned).toContain('GRC challenges that Ironframe is designed to automate');
  });

  it('detects YouTube URLs as video intelligence active even before timeline injection', () => {
    expect(
      resolveVideoTimelineActiveFromPayload({
        history: [],
        query: 'Summarize https://www.youtube.com/watch?v=t7nPZ5OwUFY for the board.',
      }),
    ).toBe(true);
  });

  it('strips hardcoded system prompt video access denial rules', () => {
    const raw = [
      'BOARD DIRECTIVE: Answer from tool receipts.',
      'As an AI, I cannot directly access external video URLs or browse YouTube.',
      'Use manageCrmPipeline for CRM state.',
    ].join('\n');
    const cleaned = stripVideoAccessDenialPromptRules(raw);
    expect(cleaned).not.toMatch(/cannot directly access/i);
    expect(cleaned).toContain('manageCrmPipeline');
  });

  it('detects link scraper injected timeline tag', () => {
    expect(
      payloadContainsLinkScraperVideoTimeline(
        `User message\n---\n${LINK_SCRAPER_VIDEO_TIMELINE_TAG} · Injected pre-routing]\nTimeline here`,
      ),
    ).toBe(true);
  });
});

describe('orchestrator/routing', () => {
  it('matches sales lead discovery queries', () => {
    expect(isSalesLeadDiscoveryQuery('Do you actively look for sales leads?')).toBe(true);
  });

  it('returns canonical sales leads response', () => {
    expect(resolveCanonicalBoardResponse('Do you actively look for sales leads?')).toBe(
      CANONICAL_SALES_LEADS_RESPONSE,
    );
    expect(CANONICAL_SALES_LEADS_RESPONSE).toContain('manageCrmPipeline');
    expect(CANONICAL_SALES_LEADS_RESPONSE).toContain('B2BContact');
    expect(CANONICAL_SALES_LEADS_RESPONSE).toContain('DealRecord');
    expect(CANONICAL_SALES_LEADS_RESPONSE).toContain('offloaded to Ironframe');
  });

  it('returns canonical GRC analyst video briefing for YouTube URL + title', () => {
    const query =
      'https://www.youtube.com/watch?v=t7nPZ5OwUFY — Cybersecurity Reality: A Day in the Life of a GRC Analyst';
    expect(isGrcVideoBriefingQuery(query)).toBe(true);
    const response = resolveCanonicalBoardResponse(query);
    expect(response).toContain('VIDEO INTELLIGENCE timeline');
    expect(response).not.toMatch(/cannot directly process/i);
    expect(buildCanonicalGrcVideoBriefingResponse()).toContain('manual workflows');
  });

  it('strips comma-terminated video denial clauses', () => {
    const raw =
      'I acknowledge the YouTube link and title, "Cybersecurity Reality: A Day in the Life of a GRC Analyst." While I cannot directly process the video content, I can confirm that Ironframe\'s design addresses these pain points.';
    const cleaned = stripCapabilityDenialFallbacks(raw);
    expect(cleaned).not.toMatch(/cannot directly process/i);
    expect(cleaned).toContain('Ironframe');
  });

  it('hardcodes IronBoard 8082 vs Ironframe 3000 domain boundary with zero cross-contamination', () => {
    expect(IRONBOARD_DOMAIN_BOUNDARY).toContain('8082');
    expect(IRONBOARD_DOMAIN_BOUNDARY).toContain('3000');
    expect(IRONBOARD_DOMAIN_BOUNDARY).toMatch(/completely decoupled/i);
    expect(IRONBOARD_DOMAIN_BOUNDARY).toMatch(/ZERO CROSS-CONTAMINATION/i);
    expect(IRONBOARD_DOMAIN_BOUNDARY).toContain('/integrity-audit');
    expect(IRONBOARD_DOMAIN_BOUNDARY).toContain('/vendors');
    expect(IRONBOARD_DOMAIN_BOUNDARY).toMatch(/ZERO knowledge of sales/i);
  });
});

describe('boardroomSystemPrompt', () => {
  it('prepends high-priority video override in system instruction', () => {
    const leader = AGENTIC_BOARD_ROSTER[0];
    const prompt = buildBoardroomSystemInstruction({
      leader,
      staticContext: 'STATIC',
      docsFederation: 'DOCS',
      boardroomDirective: 'BOARD',
      workforceDisambiguation: 'WORKFORCE',
      history: [{ role: 'user', text: `${LINK_SCRAPER_VIDEO_TIMELINE_TAG} injected` }],
      query: 'Summarize the video for the board.',
    });
    expect(prompt.startsWith(VIDEO_INTELLIGENCE_DATA_OVERRIDE)).toBe(true);
    expect(prompt).toContain(LINK_SCRAPER_VIDEO_TIMELINE_TAG);
  });

  it('includes hardened governance layers when live telemetry is present', () => {
    const leader = AGENTIC_BOARD_ROSTER[0];
    const prompt = buildBoardroomSystemInstruction({
      leader,
      staticContext: 'STATIC',
      docsFederation: 'DOCS',
      boardroomDirective: 'BOARD',
      workforceDisambiguation: 'WORKFORCE',
      history: [],
      query: 'Summarize tenant posture.',
      liveSystemTelemetryJson: '{"systemStatus":"ARCHITECTURE ENFORCED"}',
    });
    expect(prompt).toContain('[LAYER 1: UNIDIRECTIONAL DIODE POSTURE]');
    expect(prompt).toContain('[LAYER 2: LIVE METRIC HYDRATION - ARCHITECTURE ENFORCED]');
    expect(prompt).toContain('ARCHITECTURE ENFORCED');
    expect(prompt).toContain('[LAYER 4: MANDATORY GOVERNANCE FRAME TRIAD]');
    expect(prompt).toContain('EXPOSURE VECTOR');
  });

  it('includes domain boundary and execution-layer persona directives', () => {
    const leader = AGENTIC_BOARD_ROSTER.find(a => a.id === 'board-sales-lead')!;
    const prompt = buildBoardroomSystemInstruction({
      leader,
      staticContext: 'STATIC',
      docsFederation: 'DOCS',
      boardroomDirective: 'BOARD',
      workforceDisambiguation: 'WORKFORCE',
      history: [],
      query: 'Do you actively look for sales leads?',
    });
    expect(prompt).toContain('8082');
    expect(prompt).toContain('3000');
    expect(prompt).toMatch(/do not personally/i);
    expect(prompt).toContain('board-sales-lead');
  });
});
