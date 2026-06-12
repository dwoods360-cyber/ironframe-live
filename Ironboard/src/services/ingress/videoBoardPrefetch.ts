import { randomUUID } from 'node:crypto';
import {
  GRC_ANALYST_DAY_VIDEO_TITLE,
  GRC_ANALYST_DAY_VIDEO_TRANSCRIPT,
  isGrcAnalystDayVideoReference,
  isKnownGrcAnalystVideoId,
} from '../../knowledge/grcAnalystDayVideoSeed.js';
import { resolveBoardOrgTenantId } from '../crm/strategicIntelIngress.js';
import { persistVideoIntelligenceDocument } from '../crm/videoIntelligenceStore.js';
import { processVideoIrongateIngress } from './irongateVideoIngress.js';
import { parseVideoIntelligencePayload } from './videoMultimodalParser.js';
import {
  resolvePrimaryVideoAssetLink,
  resolveVideoQueryIntent,
  type VideoQueryIntent,
} from './videoQueryIntent.js';
import type { VideoIntelligenceParseResult } from '../../types/videoIngress.js';
import { VIDEO_INTELLIGENCE_METRIC_TAG } from '../../types/videoIngress.js';

export type VideoBoardPrefetchResult = {
  ok: boolean;
  enrichment: string;
  parsed: VideoIntelligenceParseResult | null;
  interactionId: string | null;
  traceId: string | null;
};

export type VideoAssetIngestResult = {
  parsed: VideoIntelligenceParseResult;
  interactionId: string;
  traceId: string;
  markdownDocument: string;
};

function buildEnrichment(
  parsed: VideoIntelligenceParseResult,
  interactionId: string | null,
  traceId: string,
): string {
  return [
    'VIDEO INTELLIGENCE GROUND TRUTH (mandatory — cite timed blocks; never claim you cannot watch videos):',
    `metricTag=${VIDEO_INTELLIGENCE_METRIC_TAG}`,
    `traceId=${traceId}`,
    interactionId ? `interactionId=${interactionId}` : '',
    `parserMode=${parsed.metadata.parserMode}`,
    `title=${parsed.metadata.title}`,
    parsed.metadata.assetLink ? `assetLink=${parsed.metadata.assetLink}` : '',
    '',
    parsed.metadata.summary,
    '',
    'MARKDOWN TIMELINE DOCUMENT:',
    parsed.markdownDocument,
  ]
    .filter(Boolean)
    .join('\n');
}

async function ingestVideoRawData(
  tenantId: string,
  rawData: {
    asset_link?: string;
    transcript?: typeof GRC_ANALYST_DAY_VIDEO_TRANSCRIPT;
    title?: string;
    locale?: string;
  },
  options?: { persistToCrm?: boolean },
): Promise<VideoAssetIngestResult> {
  const gate = await processVideoIrongateIngress({
    tenant_id: tenantId,
    source_type: 'VIDEO_INGRESS',
    raw_data: rawData,
  });

  if (gate.status !== 'CLEAN') {
    throw new Error(`IRONGATE_BLOCK: ${gate.reason}`);
  }

  const parsed = await parseVideoIntelligencePayload(gate.envelope.raw_data);
  if (options?.persistToCrm === false) {
    return {
      parsed,
      interactionId: `memory-${randomUUID()}`,
      traceId: gate.trace_id,
      markdownDocument: parsed.markdownDocument,
    };
  }

  try {
    const stored = await persistVideoIntelligenceDocument(tenantId, gate.trace_id, parsed);
    return {
      parsed,
      interactionId: stored.interactionId,
      traceId: gate.trace_id,
      markdownDocument: parsed.markdownDocument,
    };
  } catch (err) {
    console.warn('[IRONBOARD VIDEO INGEST] CRM persist failed; returning in-memory parse', err);
    return {
      parsed,
      interactionId: `memory-${randomUUID()}`,
      traceId: gate.trace_id,
      markdownDocument: parsed.markdownDocument,
    };
  }
}

export function buildRawDataForBoardVideoLink(
  assetLink: string,
  contextText: string,
  titleHint?: string,
): {
  asset_link?: string;
  transcript?: typeof GRC_ANALYST_DAY_VIDEO_TRANSCRIPT;
  title?: string;
} {
  const videoIdMatch = assetLink.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  const videoId = videoIdMatch?.[1] ?? '';
  if (isGrcAnalystDayVideoReference(contextText) || isKnownGrcAnalystVideoId(videoId)) {
    return {
      asset_link: assetLink,
      title: GRC_ANALYST_DAY_VIDEO_TITLE,
      transcript: GRC_ANALYST_DAY_VIDEO_TRANSCRIPT,
    };
  }
  return {
    asset_link: assetLink,
    title: titleHint,
  };
}

/** Out-of-band video extractor handshake for link scraper middleware. */
export async function ingestVideoAssetLinkForBoard(
  tenantIdRaw: string,
  assetLink: string,
  options?: { titleHint?: string; locale?: string; contextText?: string },
): Promise<VideoAssetIngestResult> {
  const tenantId = tenantIdRaw.trim() || resolveBoardOrgTenantId();
  const rawData = buildRawDataForBoardVideoLink(
    assetLink,
    options?.contextText ?? '',
    options?.titleHint,
  );
  return ingestVideoRawData(tenantId, rawData);
}

/** Link-scraper entry — never throws; attaches curated GRC transcript when title/id matches. */
export async function ingestVideoAssetLinkForLinkScraper(
  tenantIdRaw: string,
  assetLink: string,
  contextText: string,
  options?: { titleHint?: string },
): Promise<VideoAssetIngestResult> {
  const tenantId = tenantIdRaw.trim() || resolveBoardOrgTenantId();
  const rawData = buildRawDataForBoardVideoLink(assetLink, contextText, options?.titleHint);
  try {
    return await ingestVideoRawData(tenantId, rawData);
  } catch (err) {
    console.warn('[LINK SCRAPER VIDEO INGEST]', err);
    return ingestVideoRawData(tenantId, rawData, { persistToCrm: false });
  }
}

export async function prefetchVideoIntelligenceForBoardQuery(
  query: string,
  tenantIdRaw?: string,
): Promise<VideoBoardPrefetchResult> {
  const intent = resolveVideoQueryIntent(query);
  const tenantId = tenantIdRaw?.trim() || resolveBoardOrgTenantId();
  const assetLink = resolvePrimaryVideoAssetLink(intent);

  if (!assetLink && !intent.referencesGrcAnalystDayVideo) {
    return { ok: false, enrichment: '', parsed: null, interactionId: null, traceId: null };
  }

  try {
    const rawData = buildRawDataFromIntent(intent, assetLink);
    const ingest = await ingestVideoRawData(tenantId, rawData);
    return {
      ok: true,
      enrichment: buildEnrichment(ingest.parsed, ingest.interactionId, ingest.traceId),
      parsed: ingest.parsed,
      interactionId: ingest.interactionId,
      traceId: ingest.traceId,
    };
  } catch (err) {
    const traceId = randomUUID();
    console.warn('[IRONBOARD VIDEO PREFETCH]', err);
    return {
      ok: false,
      enrichment: [
        'VIDEO INTELLIGENCE PREFETCH FAILED — do not claim inability to analyze video; report ingress error and cite GRC workday Strategic Intel manifest instead.',
        err instanceof Error ? err.message : String(err),
      ].join('\n'),
      parsed: null,
      interactionId: null,
      traceId,
    };
  }
}

function buildRawDataFromIntent(
  intent: VideoQueryIntent,
  assetLink: string | null,
): {
  asset_link?: string;
  transcript?: typeof GRC_ANALYST_DAY_VIDEO_TRANSCRIPT;
  title?: string;
} {
  if (assetLink) {
    return buildRawDataForBoardVideoLink(assetLink, intent.referencesGrcAnalystDayVideo ? GRC_ANALYST_DAY_VIDEO_TITLE : '', intent.titleHint ?? undefined);
  }
  if (intent.referencesGrcAnalystDayVideo) {
    return {
      title: GRC_ANALYST_DAY_VIDEO_TITLE,
      transcript: GRC_ANALYST_DAY_VIDEO_TRANSCRIPT,
    };
  }

  return {
    asset_link: assetLink ?? undefined,
    title: intent.titleHint ?? undefined,
  };
}
