import { describe, expect, it } from 'vitest';
import {
  finalizeSanitizedBoardCompletion,
  MARKET_RESEARCH_DENIAL_REWRITE,
  stripCapabilityDenialFallbacks,
  YOUTUBE_VIDEO_DENIAL_REWRITE,
} from '../../Ironboard/src/services/boardResponseLibrary.js';
import {
  isMarketResearchCapabilityQuery,
  shouldPrefetchWeb,
} from '../../Ironboard/src/services/boardroomQueryIntent.js';

describe('boardResponseLibrary video denials', () => {
  const shortsDenial =
    "I am sorry, but including the YouTube Shorts link you provided. Therefore, I am unable to retrieve the content of the video at `https://www.youtube.com/shorts/0_0L4at5mxc` to gather the requested factual information. Please provide a textual description of the video's content so I can proceed.";

  it('strips Shorts capability-denial boilerplate', () => {
    const stripped = stripCapabilityDenialFallbacks(shortsDenial);
    expect(stripped.toLowerCase()).not.toContain('unable to retrieve the content of the video');
    expect(stripped.toLowerCase()).not.toContain('textual description');
  });

  it('rewrites empty denial completions for YouTube queries', () => {
    const { text, rewritten } = finalizeSanitizedBoardCompletion(shortsDenial, true, {
      query: 'https://www.youtube.com/shorts/0_0L4at5mxc',
    });
    expect(rewritten).toBe(true);
    expect(text).toContain(YOUTUBE_VIDEO_DENIAL_REWRITE);
  });
});

describe('boardResponseLibrary market research denials', () => {
  const marketDenial =
    'I am not capable of performing "real market research" in the comprehensive sense that involves designing studies. The human operator would need to execute specific searches. Run the Market Flywheel batch loader for this geography.';

  it('strips market-research capability denial boilerplate', () => {
    const stripped = stripCapabilityDenialFallbacks(marketDenial);
    expect(stripped.toLowerCase()).not.toContain('not capable of performing');
    expect(stripped.toLowerCase()).not.toContain('human operator');
    expect(stripped.toLowerCase()).not.toContain('batch loader');
  });

  it('rewrites GTM capability denials with execution directive', () => {
    const { text, rewritten } = finalizeSanitizedBoardCompletion(marketDenial, true, {
      query: 'Are you not able to perform real market research?',
      gtmMarketQuery: true,
    });
    expect(rewritten).toBe(true);
    expect(text).toContain(MARKET_RESEARCH_DENIAL_REWRITE);
  });

  it('detects meta market-research capability questions', () => {
    expect(isMarketResearchCapabilityQuery('Are you not able to perform real market research?')).toBe(
      true,
    );
    expect(isMarketResearchCapabilityQuery('Perform market research for Germany')).toBe(false);
  });
});

describe('boardroomQueryIntent web prefetch', () => {
  it('skips web prefetch when a YouTube URL is present', () => {
    expect(shouldPrefetchWeb('https://www.youtube.com/shorts/0_0L4at5mxc')).toBe(false);
    expect(shouldPrefetchWeb('What time is it in London?')).toBe(true);
  });
});
