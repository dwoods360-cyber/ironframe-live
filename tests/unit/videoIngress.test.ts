import { describe, expect, it } from 'vitest';
import {
  stripTrackingTokensFromUrl,
  processVideoIrongateIngress,
} from '../../Ironboard/src/services/ingress/irongateVideoIngress.ts';
import { parseVideoIntelligencePayload } from '../../Ironboard/src/services/ingress/videoMultimodalParser.ts';
import { VIDEO_INTELLIGENCE_METRIC_TAG } from '../../Ironboard/src/types/videoIngress.ts';

const TENANT = '5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01';

describe('video ingress Irongate gate', () => {
  it('strips tracking tokens from asset URLs', () => {
    const clean = stripTrackingTokensFromUrl(
      'https://example.com/watch?v=abc123&utm_source=email&fbclid=xyz&gclid=abc',
    );
    expect(clean).toContain('v=abc123');
    expect(clean).not.toContain('utm_source');
    expect(clean).not.toContain('fbclid');
    expect(clean).not.toContain('gclid');
  });

  it('quarantines payloads missing tenant and transcript', async () => {
    const result = await processVideoIrongateIngress({
      source_type: 'VIDEO_INGRESS',
      raw_data: { asset_link: 'https://example.com/video' },
    });
    expect(result.status).toBe('QUARANTINED');
  });

  it('accepts transcript arrays after DMZ sanitization', async () => {
    const result = await processVideoIrongateIngress({
      tenant_id: TENANT,
      source_type: 'VIDEO_INGRESS',
      raw_data: {
        title: 'Board Briefing',
        transcript: [
          { startMs: 0, endMs: 4000, text: 'Opening remarks on continuous audit.' },
          { startMs: 4000, endMs: 9000, text: 'LP-10 config churn requires Ironscribe hashes.' },
        ],
      },
    });
    expect(result.status).toBe('CLEAN');
    if (result.status === 'CLEAN') {
      expect(result.envelope.raw_data.transcript).toHaveLength(2);
    }
  });
});

describe('video multimodal parser', () => {
  it('packages timeline blocks into markdown with video_intelligence metric context', async () => {
    const parsed = await parseVideoIntelligencePayload({
      title: 'GRC Ops Review',
      transcript: [
        { start: '00:00', end: '00:05', text: 'Risk exposure grid baseline review.', speaker: 'CISO' },
        { start: '00:05', end: '00:12', text: 'Ironintel OSINT correlation checkpoint.', speaker: 'Analyst' },
      ],
    });

    expect(parsed.timeline).toHaveLength(2);
    expect(parsed.metadata.blockCount).toBe(2);
    expect(parsed.metadata.parserMode).toBe('transcript_direct');
    expect(parsed.markdownDocument).toContain('Video Intelligence: GRC Ops Review');
    expect(parsed.markdownDocument).toContain(VIDEO_INTELLIGENCE_METRIC_TAG);
    expect(parsed.markdownDocument).toContain('00:00');
    expect(parsed.markdownDocument).toContain('Risk exposure grid baseline review.');
  });
});
