import { describe, expect, it } from 'vitest';
import {
  isGrcAnalystDayVideoReference,
  GRC_ANALYST_DAY_VIDEO_TITLE,
} from '../../Ironboard/src/knowledge/grcAnalystDayVideoSeed.ts';
import {
  requiresVideoIntelligencePrefetch,
  resolveVideoQueryIntent,
} from '../../Ironboard/src/services/ingress/videoQueryIntent.ts';

describe('video board query intent', () => {
  it('detects the GRC analyst day-in-the-life board briefing without a URL', () => {
    const query =
      'For an inside look into the day-to-day realities and strategic problem-solving that inspired our automation goals, please refer to this analytical overview: Cybersecurity Reality: A Day in the Life of a GRC Analyst. This video provides helpful context for the board.';
    expect(isGrcAnalystDayVideoReference(query)).toBe(true);
    expect(requiresVideoIntelligencePrefetch(query)).toBe(true);
    const intent = resolveVideoQueryIntent(query);
    expect(intent.referencesGrcAnalystDayVideo).toBe(true);
    expect(intent.titleHint).toBe(GRC_ANALYST_DAY_VIDEO_TITLE);
  });

  it('attaches curated GRC transcript for canonical analyst video id', async () => {
    const { buildRawDataForBoardVideoLink } = await import(
      '../../Ironboard/src/services/ingress/videoBoardPrefetch.ts'
    );
    const raw = buildRawDataForBoardVideoLink(
      'https://www.youtube.com/watch?v=t7nPZ5OwUFY',
      'Cybersecurity Reality: A Day in the Life of a GRC Analyst',
    );
    expect(raw.transcript?.length).toBeGreaterThan(0);
    expect(raw.title).toContain('GRC Analyst');
  });
});
