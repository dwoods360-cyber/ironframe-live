import {
  GRC_ANALYST_DAY_VIDEO_TITLE,
  isGrcAnalystDayVideoReference,
  resolveGrcAnalystDayVideoUrl,
} from '../../knowledge/grcAnalystDayVideoSeed.js';
import {
  scanStreamingMediaUrls,
  STREAMING_MEDIA_URL_PATTERN,
} from '../../middleware/linkScraper.js';
import { stripTrackingTokensFromUrl } from './irongateVideoIngress.js';

const GENERIC_VIDEO_URL_RE =
  /https?:\/\/[^\s)\]"']+\.(?:mp4|webm|mov|m3u8)(?:\?[^\s)\]"']*)?/gi;

export type VideoQueryIntent = {
  assetLinks: string[];
  titleHint: string | null;
  referencesGrcAnalystDayVideo: boolean;
};

export function extractVideoAssetLinks(query: string): string[] {
  const links = new Set<string>();
  for (const match of scanStreamingMediaUrls(query)) {
    links.add(match.canonicalUrl);
  }
  for (const match of query.matchAll(GENERIC_VIDEO_URL_RE)) {
    if (match[0]) links.add(stripTrackingTokensFromUrl(match[0]));
  }
  return [...links];
}

export { STREAMING_MEDIA_URL_PATTERN };

export function requiresVideoIntelligencePrefetch(query: string): boolean {
  const intent = resolveVideoQueryIntent(query);
  return intent.assetLinks.length > 0 || intent.referencesGrcAnalystDayVideo;
}

export function resolveVideoQueryIntent(query: string): VideoQueryIntent {
  const assetLinks = extractVideoAssetLinks(query);
  const referencesGrcAnalystDayVideo = isGrcAnalystDayVideoReference(query);

  let titleHint: string | null = null;
  if (referencesGrcAnalystDayVideo) {
    titleHint = GRC_ANALYST_DAY_VIDEO_TITLE;
  } else if (/\bvideo\b/i.test(query)) {
    const quoted = query.match(/["“]([^"”]{8,120})["”]/);
    if (quoted?.[1]) titleHint = quoted[1].trim();
  }

  return { assetLinks, titleHint, referencesGrcAnalystDayVideo };
}

export function resolvePrimaryVideoAssetLink(intent: VideoQueryIntent): string | null {
  if (intent.assetLinks.length > 0) return intent.assetLinks[0];
  if (intent.referencesGrcAnalystDayVideo) return resolveGrcAnalystDayVideoUrl();
  return null;
}
