import { z } from 'zod';

export const VIDEO_INTELLIGENCE_METRIC_TAG = 'video_intelligence' as const;

export const transcriptCueSchema = z.object({
  startMs: z.number().int().nonnegative().optional(),
  endMs: z.number().int().nonnegative().optional(),
  start: z.string().min(1).optional(),
  end: z.string().min(1).optional(),
  text: z.string().min(1).max(16_000),
  speaker: z.string().max(256).optional(),
});

export const videoIngressRawDataSchema = z
  .object({
    asset_link: z.string().url().max(4096).optional(),
    transcript: z.array(transcriptCueSchema).max(2048).optional(),
    title: z.string().max(512).optional(),
    locale: z.string().max(32).optional(),
  })
  .refine(
    data =>
      Boolean(data.asset_link?.trim()) ||
      Boolean(data.transcript && data.transcript.length > 0),
    { message: 'Provide asset_link or a non-empty transcript array' },
  );

export const irongateVideoEnvelopeSchema = z.object({
  tenant_id: z.string().uuid(),
  source_type: z.enum(['API', 'WEBHOOK', 'DOC_PARSER', 'VIDEO_INGRESS']),
  raw_data: videoIngressRawDataSchema,
});

export type TranscriptCueInput = z.infer<typeof transcriptCueSchema>;
export type VideoIngressRawData = z.infer<typeof videoIngressRawDataSchema>;
export type IrongateVideoEnvelope = z.infer<typeof irongateVideoEnvelopeSchema>;

export type VideoTimelineBlock = {
  blockId: string;
  startMs: number;
  endMs: number;
  startLabel: string;
  endLabel: string;
  text: string;
  speaker: string | null;
};

export type VideoContextMetadata = {
  title: string;
  assetLink: string | null;
  locale: string | null;
  blockCount: number;
  durationMs: number;
  summary: string;
  parserMode: 'transcript_direct' | 'asset_link_gemini' | 'asset_link_skeleton';
};

export type VideoIntelligenceParseResult = {
  timeline: VideoTimelineBlock[];
  metadata: VideoContextMetadata;
  markdownDocument: string;
};

export type VideoIntelligenceCrmEnvelope = {
  metricTag: typeof VIDEO_INTELLIGENCE_METRIC_TAG;
  classification: 'Video Intelligence Update';
  sanitizedBy: 'Irongate-Agent-14';
  ingestedAt: string;
  traceId: string;
  tenantId: string;
  assetLink: string | null;
  title: string;
  markdownDocument: string;
  timeline: VideoTimelineBlock[];
  metadata: VideoContextMetadata;
};
