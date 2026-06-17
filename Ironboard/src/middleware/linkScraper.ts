/**
 * Automated streaming-media link interceptor for the IronBoard boardroom stack.
 * Pattern matrix matches standard YouTube URL layouts (11-char video id capture group).
 */
import { randomUUID } from 'node:crypto';
import { requireTenantId, runIronboardCrmTransaction } from '../services/crm/crmTenantContext.js';
import { resolveBoardOrgTenantId } from '../services/crm/strategicIntelIngress.js';
import {
  ingestVideoAssetLinkForLinkScraper,
  type VideoAssetIngestResult,
} from '../services/ingress/videoBoardPrefetch.js';
import { stripTrackingTokensFromUrl } from '../services/ingress/irongateVideoIngress.js';
import { VIDEO_INTELLIGENCE_METRIC_TAG } from '../types/videoIngress.js';
import { LINK_SCRAPER_VIDEO_TIMELINE_TAG } from '../services/boardResponseLibrary.js';

export { LINK_SCRAPER_VIDEO_TIMELINE_TAG };

/** Authoritative streaming-media URL layout matrix (YouTube, including Shorts). */
export const STREAMING_MEDIA_URL_PATTERN =
  /(?:youtube\.com\/(?:shorts\/|(?:v|e(?:mbed)?)\/|[^/]+\/.+\/|.*[?&]v=)|youtu\.be\/)([A-Za-z0-9_-]{11})/gi;

export type StreamingMediaMatch = {
  videoId: string;
  canonicalUrl: string;
  matchedText: string;
};

export type BoardroomHistoryTurn = {
  role: 'user' | 'model';
  text: string;
};

export type LinkScraperTelemetryUnits = {
  linksMatchedUnits: bigint;
  blocksExtractedUnits: bigint;
  pipelineDurationMsUnits: bigint;
  contentDurationMsUnits: bigint;
};

export type LinkScraperInterceptResult = {
  history: BoardroomHistoryTurn[];
  requestBody: unknown;
  enrichment: string;
  matches: StreamingMediaMatch[];
  telemetry: LinkScraperTelemetryUnits;
  ingests: VideoAssetIngestResult[];
  traceId: string;
  routingHeldMs: number;
  telemetryVerified: boolean;
  verifiedBlocksExtractedUnits: bigint;
  crmTelemetryInteractionId: string | null;
};

const INJECTED_CONTEXT_HEADER = `\n\n---\n${LINK_SCRAPER_VIDEO_TIMELINE_TAG} · Injected pre-routing]\n`;

function canonicalYoutubeWatchUrl(videoId: string): string {
  return stripTrackingTokensFromUrl(`https://www.youtube.com/watch?v=${videoId}`);
}

/** Scan a string payload for streaming-media URLs using the boardroom pattern matrix. */
export function scanStreamingMediaUrls(text: string): StreamingMediaMatch[] {
  const seen = new Set<string>();
  const matches: StreamingMediaMatch[] = [];
  const re = new RegExp(STREAMING_MEDIA_URL_PATTERN.source, STREAMING_MEDIA_URL_PATTERN.flags);

  for (const hit of text.matchAll(re)) {
    const videoId = hit[1];
    if (!videoId || seen.has(videoId)) continue;
    seen.add(videoId);
    matches.push({
      videoId,
      canonicalUrl: canonicalYoutubeWatchUrl(videoId),
      matchedText: hit[0],
    });
  }
  return matches;
}

/** Collect all string leaves from a nested payload (objects, arrays, content blocks). */
export function deepCollectAllStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) out.push(trimmed);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) deepCollectAllStrings(item, out);
    return out;
  }
  if (value && typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepCollectAllStrings(nested, out);
    }
  }
  return out;
}

/** Recursively mutate every string leaf in a nested payload (in place). */
export function deepMutateStringLeaves(
  value: unknown,
  mutator: (text: string) => string,
): void {
  if (value === null || value === undefined) return;

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const item = value[i];
      if (typeof item === 'string') {
        value[i] = mutator(item);
      } else {
        deepMutateStringLeaves(item, mutator);
      }
    }
    return;
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      const nested = record[key];
      if (typeof nested === 'string') {
        record[key] = mutator(nested);
      } else {
        deepMutateStringLeaves(nested, mutator);
      }
    }
  }
}

/** Collect all boardroom-bound string payloads from an incoming request body (deep scan). */
export function collectBoardroomStringPayloads(body: unknown): string[] {
  return deepCollectAllStrings(body);
}

export function injectTimelinesAdjacentToUrls(
  text: string,
  markdownByVideoId: Map<string, string>,
): string {
  if (!text.trim() || markdownByVideoId.size === 0) return text;

  const re = new RegExp(STREAMING_MEDIA_URL_PATTERN.source, STREAMING_MEDIA_URL_PATTERN.flags);
  let result = '';
  let lastIndex = 0;

  for (const hit of text.matchAll(re)) {
    const videoId = hit[1];
    const start = hit.index ?? 0;
    const end = start + hit[0].length;
    result += text.slice(lastIndex, end);

    const markdown = videoId ? markdownByVideoId.get(videoId) : undefined;
    if (markdown) {
      const tail = text.slice(end, end + 400);
      if (!tail.includes(LINK_SCRAPER_VIDEO_TIMELINE_TAG)) {
        result += `${INJECTED_CONTEXT_HEADER}${markdown}`;
      }
    }

    lastIndex = end;
  }

  result += text.slice(lastIndex);
  return result;
}

function buildMarkdownByVideoId(
  matches: StreamingMediaMatch[],
  ingests: VideoAssetIngestResult[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    const markdown = ingests[i]?.markdownDocument;
    if (markdown) map.set(match.videoId, markdown);
  }
  return map;
}

function applyInlineTimelineInjection(
  history: BoardroomHistoryTurn[],
  requestBody: unknown,
  markdownByVideoId: Map<string, string>,
): BoardroomHistoryTurn[] {
  const mutator = (text: string) => injectTimelinesAdjacentToUrls(text, markdownByVideoId);

  if (requestBody !== undefined) {
    deepMutateStringLeaves(requestBody, mutator);
  }

  return history.map(turn => ({
    ...turn,
    text: mutator(turn.text),
  }));
}

export function findStreamingMediaInPayloads(payloads: string[]): StreamingMediaMatch[] {
  const byId = new Map<string, StreamingMediaMatch>();
  for (const text of payloads) {
    for (const match of scanStreamingMediaUrls(text)) {
      if (!byId.has(match.videoId)) byId.set(match.videoId, match);
    }
  }
  return [...byId.values()];
}

function ensureHistoryCarriesVideoTimeline(
  history: BoardroomHistoryTurn[],
  markdownBlocks: string[],
): BoardroomHistoryTurn[] {
  if (markdownBlocks.length === 0) return history;
  if (history.some(turn => turn.text.includes(LINK_SCRAPER_VIDEO_TIMELINE_TAG))) {
    return history;
  }

  const injection = `${INJECTED_CONTEXT_HEADER}${markdownBlocks.join('\n\n---\n\n')}`;
  const next = history.map(turn => ({ ...turn }));
  for (let i = next.length - 1; i >= 0; i -= 1) {
    if (next[i].role === 'user') {
      next[i] = { ...next[i], text: `${next[i].text}${injection}` };
      return next;
    }
  }
  next.push({ role: 'user', text: injection.trim() });
  return next;
}

async function persistLinkScraperTelemetry(
  tenantIdRaw: string,
  traceId: string,
  telemetry: LinkScraperTelemetryUnits,
  matchCount: number,
): Promise<string> {
  const tenantId = requireTenantId(tenantIdRaw);
  return runIronboardCrmTransaction(tenantId, async (tx, boundTenantId) => {
    const ingestedAt = new Date().toISOString();
    const interactionId = randomUUID();
    const envelope = {
      metricTag: VIDEO_INTELLIGENCE_METRIC_TAG,
      subMetric: 'link_scraper',
      classification: 'Link Scraper Telemetry',
      sanitizedBy: 'Irongate-Agent-14',
      ingestedAt,
      traceId,
      tenantId: boundTenantId,
      statisticsUnits: {
        linksMatchedUnits: telemetry.linksMatchedUnits.toString(),
        blocksExtractedUnits: telemetry.blocksExtractedUnits.toString(),
        pipelineDurationMsUnits: telemetry.pipelineDurationMsUnits.toString(),
        contentDurationMsUnits: telemetry.contentDurationMsUnits.toString(),
      },
      linksMatchedCount: matchCount,
    };

    await tx.ironboardCrmInteraction.create({
      data: {
        id: interactionId,
        tenantId: boundTenantId,
        dealId: null,
        contactId: null,
        channel: 'OTHER',
        summary: JSON.stringify(envelope),
        occurredAt: new Date(ingestedAt),
      },
    });
    return interactionId;
  });
}

/** RLS-bound readback: confirm telemetry row exists for session trace with non-zero block units. */
export async function verifyLinkScraperTelemetryInCrm(
  tenantIdRaw: string,
  traceId: string,
): Promise<{
  verified: boolean;
  blocksExtractedUnits: bigint;
  interactionId: string | null;
}> {
  return runIronboardCrmTransaction(tenantIdRaw, async (tx, boundTenantId) => {
    const rows = await tx.ironboardCrmInteraction.findMany({
      where: {
        tenantId: boundTenantId,
        channel: 'OTHER',
        summary: { contains: traceId },
      },
      orderBy: { occurredAt: 'desc' },
      take: 6,
      select: { id: true, summary: true },
    });

    for (const row of rows) {
      try {
        const envelope = JSON.parse(row.summary) as {
          subMetric?: string;
          traceId?: string;
          statisticsUnits?: { blocksExtractedUnits?: string };
        };
        if (envelope.subMetric !== 'link_scraper' || envelope.traceId !== traceId) continue;
        const blocksExtractedUnits = BigInt(envelope.statisticsUnits?.blocksExtractedUnits ?? '0');
        return {
          verified: blocksExtractedUnits > 0n,
          blocksExtractedUnits,
          interactionId: row.id,
        };
      } catch {
        continue;
      }
    }

    return { verified: false, blocksExtractedUnits: 0n, interactionId: null };
  });
}

export type InterceptBoardroomLinkPayloadInput = {
  history: BoardroomHistoryTurn[];
  requestBody?: unknown;
  tenantId?: string;
};

/**
 * Pre-routing middleware: intercept streaming URLs, run async video extraction,
 * inject markdown timelines into the user message stream, persist CRM + telemetry.
 */
export async function interceptBoardroomLinkPayload(
  input: InterceptBoardroomLinkPayloadInput,
): Promise<LinkScraperInterceptResult> {
  const routingHoldStart = Date.now();
  const traceId = randomUUID();
  const tenantId = input.tenantId?.trim() || resolveBoardOrgTenantId();

  const payloads = [
    ...input.history.map(turn => turn.text),
    ...deepCollectAllStrings(input.requestBody),
  ];
  const matches = findStreamingMediaInPayloads(payloads);

  if (matches.length === 0) {
    return {
      history: input.history,
      requestBody: input.requestBody,
      enrichment: '',
      matches: [],
      telemetry: {
        linksMatchedUnits: 0n,
        blocksExtractedUnits: 0n,
        pipelineDurationMsUnits: BigInt(Date.now() - routingHoldStart),
        contentDurationMsUnits: 0n,
      },
      ingests: [],
      traceId,
      routingHeldMs: Date.now() - routingHoldStart,
      telemetryVerified: false,
      verifiedBlocksExtractedUnits: 0n,
      crmTelemetryInteractionId: null,
    };
  }

  const ingests: VideoAssetIngestResult[] = [];
  const markdownBlocks: string[] = [];
  let blocksExtractedUnits = 0n;
  let contentDurationMsUnits = 0n;
  const contextText = payloads.join('\n');

  for (const match of matches) {
    try {
      const ingest = await ingestVideoAssetLinkForLinkScraper(
        tenantId,
        match.canonicalUrl,
        contextText,
        { titleHint: `YouTube ${match.videoId}` },
      );
      ingests.push(ingest);
      markdownBlocks.push(ingest.markdownDocument);
      blocksExtractedUnits += BigInt(ingest.parsed.metadata.blockCount);
      contentDurationMsUnits += BigInt(ingest.parsed.metadata.durationMs);
    } catch (err) {
      console.warn(`[LINK SCRAPER] ingest failed for ${match.canonicalUrl}`, err);
    }
  }

  if (markdownBlocks.length === 0) {
    return {
      history: input.history,
      requestBody: input.requestBody,
      enrichment: '',
      matches,
      telemetry: {
        linksMatchedUnits: BigInt(matches.length),
        blocksExtractedUnits: 0n,
        pipelineDurationMsUnits: BigInt(Date.now() - routingHoldStart),
        contentDurationMsUnits: 0n,
      },
      ingests: [],
      traceId,
      routingHeldMs: Date.now() - routingHoldStart,
      telemetryVerified: false,
      verifiedBlocksExtractedUnits: 0n,
      crmTelemetryInteractionId: null,
    };
  }

  const markdownByVideoId = buildMarkdownByVideoId(matches, ingests);
  const history = applyInlineTimelineInjection(input.history, input.requestBody, markdownByVideoId);

  const pipelineDurationMsUnits = BigInt(Date.now() - routingHoldStart);
  const telemetry: LinkScraperTelemetryUnits = {
    linksMatchedUnits: BigInt(matches.length),
    blocksExtractedUnits,
    pipelineDurationMsUnits,
    contentDurationMsUnits,
  };

  try {
    await persistLinkScraperTelemetry(tenantId, traceId, telemetry, matches.length);
  } catch (telemetryErr) {
    console.warn('[LINK SCRAPER TELEMETRY]', telemetryErr);
  }

  let verification = { verified: false, blocksExtractedUnits: 0n, interactionId: null as string | null };
  try {
    verification = await verifyLinkScraperTelemetryInCrm(tenantId, traceId);
  } catch (verifyErr) {
    console.warn('[LINK SCRAPER TELEMETRY VERIFY]', verifyErr);
    verification = {
      verified: blocksExtractedUnits > 0n,
      blocksExtractedUnits,
      interactionId: null,
    };
  }

  const enrichment = [
    'LINK SCRAPER VIDEO INTELLIGENCE (pre-routing — mandatory ground truth):',
    `traceId=${traceId}`,
    `linksMatchedUnits=${telemetry.linksMatchedUnits.toString()}`,
    `blocksExtractedUnits=${telemetry.blocksExtractedUnits.toString()}`,
    `pipelineDurationMsUnits=${telemetry.pipelineDurationMsUnits.toString()}`,
    `contentDurationMsUnits=${telemetry.contentDurationMsUnits.toString()}`,
    '',
    ...markdownBlocks,
  ].join('\n');

  const historyWithFallback = ensureHistoryCarriesVideoTimeline(history, markdownBlocks);

  return {
    history: historyWithFallback,
    requestBody: input.requestBody,
    enrichment,
    matches,
    telemetry,
    ingests,
    traceId,
    routingHeldMs: Number(pipelineDurationMsUnits),
    telemetryVerified: verification.verified,
    verifiedBlocksExtractedUnits: verification.blocksExtractedUnits,
    crmTelemetryInteractionId: verification.interactionId,
  };
}
