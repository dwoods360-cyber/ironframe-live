import { describe, expect, it } from 'vitest';
import { scanStreamingMediaUrls } from '../../Ironboard/src/middleware/linkScraper.js';

describe('linkScraper scanStreamingMediaUrls', () => {
  it('matches YouTube Shorts URLs and normalizes to watch?v=', () => {
    const url = 'https://www.youtube.com/shorts/0_0L4at5mxc';
    const matches = scanStreamingMediaUrls(`Please review ${url}`);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.videoId).toBe('0_0L4at5mxc');
    expect(matches[0]?.canonicalUrl).toBe('https://www.youtube.com/watch?v=0_0L4at5mxc');
  });

  it('still matches standard watch URLs', () => {
    const matches = scanStreamingMediaUrls('https://www.youtube.com/watch?v=t7nPZ5OwUFY');
    expect(matches[0]?.videoId).toBe('t7nPZ5OwUFY');
  });

  it('matches youtu.be short links', () => {
    const matches = scanStreamingMediaUrls('https://youtu.be/t7nPZ5OwUFY');
    expect(matches[0]?.videoId).toBe('t7nPZ5OwUFY');
  });
});
