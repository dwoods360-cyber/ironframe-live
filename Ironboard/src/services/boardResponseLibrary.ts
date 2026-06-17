/**
 * Boardroom base response library — positive directives only.
 * Capability-denial fallback strings are banned and stripped at completion time.
 */

export const VIDEO_INTELLIGENCE_DATA_OVERRIDE = `CRITICAL DATA OVERRIDE: Video intelligence data has been pre-processed and appended to the context below under the [LINK SCRAPER] tag. Utilize this timeline as primary evidence. Do not state an inability to process video content.`;

/** Detect middleware-injected video timeline in boardroom payload text. */
export const LINK_SCRAPER_VIDEO_TIMELINE_TAG = '[LINK SCRAPER · VIDEO INTELLIGENCE TIMELINE]';

export function payloadContainsLinkScraperVideoTimeline(text: string): boolean {
  return text.includes(LINK_SCRAPER_VIDEO_TIMELINE_TAG);
}

export function payloadContainsLinkScraperVideoTimelineInHistory(
  history: Array<{ text: string }>,
  query: string,
): boolean {
  if (payloadContainsLinkScraperVideoTimeline(query)) return true;
  return history.some(turn => payloadContainsLinkScraperVideoTimeline(turn.text));
}

function deepCollectPayloadStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) out.push(trimmed);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) deepCollectPayloadStrings(item, out);
    return out;
  }
  if (value && typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepCollectPayloadStrings(nested, out);
    }
  }
  return out;
}

function collectRequestBodyStrings(body: unknown): string[] {
  return deepCollectPayloadStrings(body);
}

/** Quick detect YouTube / GRC analyst video references without importing link scraper (avoids cycles). */
export const YOUTUBE_URL_SIGNAL = /(?:youtube\.com|youtu\.be)/i;
const GRC_ANALYST_VIDEO_SIGNAL =
  /cybersecurity reality|day in the life of a grc analyst|grc analyst.*(?:video|youtube|analytical overview)/i;

export function payloadSignalsVideoIntelligence(text: string): boolean {
  if (!text.trim()) return false;
  if (payloadContainsLinkScraperVideoTimeline(text)) return true;
  if (YOUTUBE_URL_SIGNAL.test(text)) return true;
  if (GRC_ANALYST_VIDEO_SIGNAL.test(text)) return true;
  return false;
}

/** True when any boardroom-bound string contains video intelligence evidence or signals. */
export function resolveVideoTimelineActiveFromPayload(params: {
  history: Array<{ text: string }>;
  query: string;
  requestBody?: unknown;
  linkScraperEnrichment?: string;
}): boolean {
  if (params.linkScraperEnrichment?.includes('VIDEO INTELLIGENCE')) return true;
  if (params.linkScraperEnrichment?.includes(LINK_SCRAPER_VIDEO_TIMELINE_TAG)) return true;

  const payloads = [
    params.query,
    ...params.history.map(turn => turn.text),
    ...collectRequestBodyStrings(params.requestBody),
  ];
  return payloads.some(text => payloadSignalsVideoIntelligence(text));
}


/** Banned capability-denial and AI-disclaimer fragments — never emit from boardroom completions. */
export const BANNED_CAPABILITY_DENIAL_PATTERNS: RegExp[] = [
  /\bwhile i,? as an ai\b[^.?!]*[.?!]/gi,
  /\bwhile i,? as an artificial intelligence\b[^.?!]*[.?!]/gi,
  /\bwhile i cannot directly\b[^.?!,]*(?:process|watch|view|analyze|access)[^.?!,]*[.?!,]/gi,
  /\bwhile i am unable to\b[^.?!,]*(?:process|watch|view|analyze|access)[^.?!,]*[.?!,]/gi,
  /\bas an ai,? i do not personally\b[^.?!,]*[.?!,]/gi,
  /\bas an ai\b[^.?!,]*[.?!,]/gi,
  /\bas an artificial intelligence\b[^.?!,]*[.?!,]/gi,
  /\bas an ai,? i am unable to directly process video content[^.?!,]*[.?!,]/gi,
  /\bas an ai,? i cannot directly access or analyze\b[^.?!,]*[.?!,]/gi,
  /\bas an ai,? i cannot directly access\b[^.?!,]*[.?!,]/gi,
  /\bi cannot directly access or analyze\b[^.?!,]*[.?!,]/gi,
  /\bi cannot directly access\b[^.?!,]*[.?!,]/gi,
  /\bi cannot directly\b[^.?!,]*(?:watch|view|analyze|process|access)[^.?!,]*[.?!,]/gi,
  /\bi do not personally\b[^.?!,]*[.?!,]/gi,
  /\bi don't personally\b[^.?!,]*[.?!,]/gi,
  /\bi cannot personally\b[^.?!,]*[.?!,]/gi,
  /\bi am unable to\b[^.?!,]*(?:process|watch|view|analyze|access)[^.?!,]*[.?!,]/gi,
  /\bi'm unable to\b[^.?!,]*(?:process|watch|view|analyze|access)[^.?!,]*[.?!,]/gi,
  /\bunable to directly (?:watch|view|analyze|process|access)\b[^.?!,]*[.?!,]/gi,
  /\bcannot (?:directly )?(?:watch|view|analyze|process) (?:the )?video\b[^.?!,]*[.?!,]/gi,
  /\bdo not have the ability to (?:watch|view|analyze|process)\b[^.?!,]*[.?!,]/gi,
  /\b(?:state|claim|say) (?:that )?(?:you )?(?:are )?unable to process video content\b[^.?!,]*[.?!,]/gi,
  /\bi acknowledge the youtube link\b[^.?!]*\bwhile i cannot directly process the video content\b[^.?!,]*[.?!,]/gi,
  /\btherefore,? i am unable to retrieve the content of the video\b[^.?!]*[.?!]/gi,
  /\bi am sorry,? but including the youtube shorts link\b[^.?!]*[.?!]/gi,
  /\bunable to retrieve the content of the video\b[^.?!]*[.?!]/gi,
  /\bplease provide a textual description of the video(?:'s content)?\b[^.?!]*[.?!]/gi,
];

export const YOUTUBE_VIDEO_DENIAL_REWRITE =
  'Board ingress registered your YouTube link. When VIDEO INTELLIGENCE or [LINK SCRAPER · VIDEO INTELLIGENCE TIMELINE] blocks appear in context, cite timed segments as primary evidence. If this asset is not yet ingested, ask for the watch?v= canonical URL or a short summary of the clip — do not refuse video-linked board requests.';

export function stripCapabilityDenialFallbacks(text: string): string {
  let next = text;
  for (const pattern of BANNED_CAPABILITY_DENIAL_PATTERNS) {
    next = next.replace(pattern, '');
  }
  return next
    .replace(/,\s*,/g, ',')
    .replace(/^\s*,\s*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** After streaming tokens, replace the full completion when denials were stripped. */
export function finalizeSanitizedBoardCompletion(
  accumulatedText: string,
  sanitizeDenials: boolean,
  context?: { query?: string },
): { text: string; rewritten: boolean } {
  if (!sanitizeDenials) return { text: accumulatedText, rewritten: false };
  const stripped = stripCapabilityDenialFallbacks(accumulatedText);
  const hadDenial = stripped !== accumulatedText.trim();
  let text = stripped;

  const query = context?.query?.trim() ?? '';
  if (query && payloadSignalsVideoIntelligence(query) && hadDenial && text.length < 160) {
    text = [stripped, YOUTUBE_VIDEO_DENIAL_REWRITE].filter(Boolean).join('\n\n');
  }

  return {
    text: text.trim(),
    rewritten: hadDenial || text !== accumulatedText.trim(),
  };
}

/** Strip hardcoded system-prompt rules that deny video / external URL access. */
export function stripVideoAccessDenialPromptRules(text: string): string {
  const linePatterns = [
    /^[^\n]*\bas an ai,? i cannot directly access[^\n]*$/gim,
    /^[^\n]*\bi cannot directly access (?:external )?(?:video|url|link|content)[^\n]*$/gim,
    /^[^\n]*\bunable to directly (?:access|watch|view|process) (?:external )?(?:video|url|link|content)[^\n]*$/gim,
  ];
  let next = text;
  for (const pattern of linePatterns) {
    next = next.replace(pattern, '');
  }
  return stripCapabilityDenialFallbacks(next);
}

export const TOOL_RESULT_PARSE_DIRECTIVE =
  'CRITICAL: If a tool returns rows or data, you must parse and display them. Synthesize strictly from populated functionResponse payloads — never substitute empty-state boilerplate when receipts contain data.';

export const BOARD_EXECUTION_DIRECTIVE_SUFFIX =
  'You possess live internet access through the googleSearch tool, direct database access via queryLocalWorkspace, and B2B CRM pipeline control via manageCrmPipeline (tenantId required, values in whole-cent integers). Execute the appropriate tool loops to retrieve ground truth before responding. Answer every distinct question in the user message — do not drop parts of a multi-part query.';

export function buildToolExecutionDirective(videoTimelineActive: boolean): string {
  const blocks = [TOOL_RESULT_PARSE_DIRECTIVE, BOARD_EXECUTION_DIRECTIVE_SUFFIX];
  if (videoTimelineActive) {
    blocks.unshift(VIDEO_INTELLIGENCE_DATA_OVERRIDE);
  }
  return blocks.join('\n\n');
}

/** Prepends CRITICAL DATA OVERRIDE when link-scraper timeline tag is present in payload. */
export function prependVideoIntelligenceSystemOverride(
  systemContext: string,
  videoTimelineActive: boolean,
): string {
  if (!videoTimelineActive) return systemContext;
  if (systemContext.startsWith(VIDEO_INTELLIGENCE_DATA_OVERRIDE)) return systemContext;
  return `${VIDEO_INTELLIGENCE_DATA_OVERRIDE}\n\n${systemContext}`;
}
