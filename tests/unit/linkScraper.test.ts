import { describe, expect, it } from 'vitest';

import {

  scanStreamingMediaUrls,

  findStreamingMediaInPayloads,

  collectBoardroomStringPayloads,

  deepCollectAllStrings,

  deepMutateStringLeaves,

  injectTimelinesAdjacentToUrls,

  STREAMING_MEDIA_URL_PATTERN,

  LINK_SCRAPER_VIDEO_TIMELINE_TAG,

} from '../../Ironboard/src/middleware/linkScraper.ts';



describe('linkScraper streaming media pattern matrix', () => {

  it('uses the authoritative YouTube layout regex', () => {

    expect(STREAMING_MEDIA_URL_PATTERN.source).toContain('youtu\\.be\\/');

    expect(STREAMING_MEDIA_URL_PATTERN.source).toContain('youtube\\.com');

  });



  it('matches watch, embed, and youtu.be layouts', () => {

    const samples = [

      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&utm_source=email',

      'https://youtube.com/embed/dQw4w9WgXcQ',

      'https://youtu.be/dQw4w9WgXcQ',

    ];

    for (const url of samples) {

      const hits = scanStreamingMediaUrls(url);

      expect(hits.length).toBe(1);

      expect(hits[0].videoId).toBe('dQw4w9WgXcQ');

      expect(hits[0].canonicalUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

      expect(hits[0].canonicalUrl).not.toContain('utm_source');

    }

  });



  it('dedupes multiple ids across boardroom string payloads', () => {

    const payloads = collectBoardroomStringPayloads({

      query: 'See https://youtu.be/abc12345678',

      history: [{ role: 'user', text: 'Also https://www.youtube.com/watch?v=abc12345678' }],

    });

    const matches = findStreamingMediaInPayloads(payloads);

    expect(matches).toHaveLength(1);

    expect(matches[0].videoId).toBe('abc12345678');

  });



  it('deep-scans nested payload objects and content blocks', () => {

    const nested = {

      payload: {

        conversation: {

          messages: [

            {

              role: 'user',

              content: [{ type: 'text', text: 'Review https://youtu.be/xyz98765432 please' }],

            },

          ],

        },

      },

      history: [{ role: 'user', content: 'Summarize the linked briefing' }],

    };



    const strings = deepCollectAllStrings(nested);

    expect(strings.some(text => text.includes('youtu.be/xyz98765432'))).toBe(true);



    const matches = findStreamingMediaInPayloads(strings);

    expect(matches).toHaveLength(1);

    expect(matches[0].videoId).toBe('xyz98765432');

  });



  it('injects timeline adjacent to the detected URL inside nested string leaves', () => {

    const body = {

      input: {

        message: {

          parts: [{ text: 'Watch https://www.youtube.com/watch?v=abc12345678 for context.' }],

        },

      },

    };



    const markdownByVideoId = new Map([['abc12345678', '## Timeline\n- 00:00 Opening']]);



    deepMutateStringLeaves(body, text =>

      injectTimelinesAdjacentToUrls(text, markdownByVideoId),

    );



    const injected = (body as { input: { message: { parts: Array<{ text: string }> } } }).input

      .message.parts[0].text;

    expect(injected).toContain('https://www.youtube.com/watch?v=abc12345678');

    expect(injected).toContain(LINK_SCRAPER_VIDEO_TIMELINE_TAG);

    expect(injected.indexOf(LINK_SCRAPER_VIDEO_TIMELINE_TAG)).toBeGreaterThan(

      injected.indexOf('abc12345678'),

    );

  });

});


