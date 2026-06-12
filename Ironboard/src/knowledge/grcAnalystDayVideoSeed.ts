import type { TranscriptCueInput } from '../types/videoIngress.js';

export const GRC_ANALYST_DAY_VIDEO_TITLE =
  'Cybersecurity Reality: A Day in the Life of a GRC Analyst';

/** Override with the canonical YouTube URL via IRONBOARD_GRC_ANALYST_VIDEO_URL. */
export const DEFAULT_GRC_ANALYST_DAY_VIDEO_URL =
  'https://www.youtube.com/watch?v=t7nPZ5OwUFY';

/** Known video IDs for the GRC analyst day-in-the-life briefing (curated transcript available). */
export const GRC_ANALYST_DAY_VIDEO_IDS = new Set(['t7nPZ5OwUFY', 'WNZ6YwJVN-s']);

export function isKnownGrcAnalystVideoId(videoId: string): boolean {
  return GRC_ANALYST_DAY_VIDEO_IDS.has(videoId.trim());
}

export function resolveGrcAnalystDayVideoUrl(): string {
  const fromEnv = process.env.IRONBOARD_GRC_ANALYST_VIDEO_URL?.trim();
  return fromEnv || DEFAULT_GRC_ANALYST_DAY_VIDEO_URL;
}

/**
 * Curated subtitle timeline — aligns with GRC Professional Workday Analysis findings.
 * Used when board queries reference the video by title without supplying a transcript.
 */
export const GRC_ANALYST_DAY_VIDEO_TRANSCRIPT: TranscriptCueInput[] = [
  {
    startMs: 0,
    endMs: 18_000,
    speaker: 'Narrator',
    text: 'A GRC analyst day begins with status pulled from four disconnected SaaS consoles — each with a different audit view, owner list, and export format.',
  },
  {
    startMs: 18_000,
    endMs: 42_000,
    speaker: 'GRC Analyst',
    text: 'Morning stand-ups stretch past forty minutes when nobody trusts a single source of truth. We re-key evidence into spreadsheets before legal and engineering will sign off.',
  },
  {
    startMs: 42_000,
    endMs: 72_000,
    speaker: 'GRC Analyst',
    text: 'Communication barriers show up as duplicate control mappings: engineering ships a feature, legal updates policy in email, and audit discovers the gap weeks later.',
  },
  {
    startMs: 72_000,
    endMs: 105_000,
    speaker: 'Compliance Lead',
    text: 'Tracking challenges hit hardest at board prep — we manually stitch logs, vendor attestations, and risk registers into a deck that is stale before the meeting starts.',
  },
  {
    startMs: 105_000,
    endMs: 138_000,
    speaker: 'Narrator',
    text: 'These manual workflows inspired automation goals: continuous integrity audit, tenant-scoped evidence vaults, and agent-orchestrated board packets with immutable export hashes.',
  },
  {
    startMs: 138_000,
    endMs: 165_000,
    speaker: 'Board Advisor',
    text: 'Ironframe targets the exact friction — cross-SaaS reconciliation, LP-10 config churn visibility, and LP-16 meta-audit rows without float-based ALE spreadsheets.',
  },
];

export function isGrcAnalystDayVideoReference(query: string): boolean {
  const q = query.toLowerCase();
  return (
    q.includes('day in the life of a grc analyst') ||
    q.includes('day in the life of a grc') ||
    q.includes('cybersecurity reality') ||
    (q.includes('grc analyst') && (q.includes('video') || q.includes('youtube') || q.includes('analytical overview')))
  );
}
