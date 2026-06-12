import { randomUUID } from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { getIronboardApiKey, getIronboardGeminiModel } from '../../loadIronboardEnv.js';
import {
  type TranscriptCueInput,
  type VideoContextMetadata,
  type VideoIngressRawData,
  type VideoIntelligenceParseResult,
  type VideoTimelineBlock,
} from '../../types/videoIngress.js';
import { formatVideoIntelligenceMarkdown } from './videoMarkdownFormatter.js';
import { formatTimecodeLabel, parseTimecodeLabel } from './videoTimecode.js';

function resolveCueTimes(
  cue: TranscriptCueInput,
  index: number,
  priorEndMs: number,
): { startMs: number; endMs: number } {
  if (typeof cue.startMs === 'number' && typeof cue.endMs === 'number') {
    return { startMs: cue.startMs, endMs: Math.max(cue.endMs, cue.startMs) };
  }
  if (cue.start && cue.end) {
    const startMs = parseTimecodeLabel(cue.start);
    const endMs = Math.max(parseTimecodeLabel(cue.end), startMs);
    return { startMs, endMs };
  }
  const startMs = priorEndMs;
  const endMs = startMs + 5000;
  return { startMs, endMs };
}

function blocksFromTranscript(
  transcript: TranscriptCueInput[],
  title: string,
  assetLink: string | null,
  locale: string | null,
): VideoTimelineBlock[] {
  const blocks: VideoTimelineBlock[] = [];
  let priorEndMs = 0;

  for (let i = 0; i < transcript.length; i += 1) {
    const cue = transcript[i];
    const { startMs, endMs } = resolveCueTimes(cue, i, priorEndMs);
    priorEndMs = endMs;
    blocks.push({
      blockId: `cue-${i + 1}`,
      startMs,
      endMs,
      startLabel: formatTimecodeLabel(startMs),
      endLabel: formatTimecodeLabel(endMs),
      text: cue.text.trim(),
      speaker: cue.speaker?.trim() ?? null,
    });
  }

  return blocks;
}

function buildMetadata(
  blocks: VideoTimelineBlock[],
  title: string,
  assetLink: string | null,
  locale: string | null,
  parserMode: VideoContextMetadata['parserMode'],
  summary: string,
): VideoContextMetadata {
  const durationMs = blocks.length > 0 ? blocks[blocks.length - 1].endMs : 0;
  return {
    title,
    assetLink,
    locale,
    blockCount: blocks.length,
    durationMs,
    summary,
    parserMode,
  };
}

function summarizeBlocks(blocks: VideoTimelineBlock[], assetLink: string | null): string {
  const excerpt = blocks
    .slice(0, 6)
    .map(b => b.text)
    .join(' ')
    .slice(0, 480);
  const linkNote = assetLink ? ` Source asset: ${assetLink}.` : '';
  return `${blocks.length} timed subtitle block(s) extracted.${linkNote} Excerpt: ${excerpt || 'n/a'}`;
}

async function parseAssetLinkWithGemini(
  assetLink: string,
  title: string,
  locale: string | null,
): Promise<VideoTimelineBlock[] | null> {
  const apiKey = getIronboardApiKey();
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
  const model = getIronboardGeminiModel();

  const prompt = [
    'You are a video intelligence pre-processor for GRC agent workflows.',
    'Given a public video asset URL, produce a JSON array of timed subtitle blocks.',
    'Each item: { "startMs": number, "endMs": number, "text": string, "speaker": string|null }.',
    'Use conservative estimates when exact timings are unknown; keep 3-8 blocks.',
    'Return ONLY valid JSON array — no markdown fences.',
    `Title: ${title}`,
    `Locale: ${locale ?? 'en-US'}`,
    `Asset URL: ${assetLink}`,
  ].join('\n');

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { temperature: 0 },
    });

    const text = response.text?.trim() ?? '';
    const jsonStart = text.indexOf('[');
    const jsonEnd = text.lastIndexOf(']');
    if (jsonStart < 0 || jsonEnd <= jsonStart) return null;

    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as Array<{
      startMs?: number;
      endMs?: number;
      text?: string;
      speaker?: string | null;
    }>;

    return parsed
      .filter(row => typeof row.text === 'string' && row.text.trim())
      .map((row, index) => {
        const startMs = typeof row.startMs === 'number' ? row.startMs : index * 8000;
        const endMs =
          typeof row.endMs === 'number' ? Math.max(row.endMs, startMs) : startMs + 8000;
        return {
          blockId: `gemini-${index + 1}`,
          startMs,
          endMs,
          startLabel: formatTimecodeLabel(startMs),
          endLabel: formatTimecodeLabel(endMs),
          text: row.text!.trim(),
          speaker: row.speaker?.trim() ?? null,
        };
      });
  } catch {
    return null;
  }
}

function skeletonBlocksFromAssetLink(assetLink: string, title: string): VideoTimelineBlock[] {
  return [
    {
      blockId: randomUUID(),
      startMs: 0,
      endMs: 1000,
      startLabel: '00:00',
      endLabel: '00:01',
      text: `Video asset registered for agent pre-processing: ${title}. Supply transcript cues for deterministic subtitle extraction.`,
      speaker: 'Irongate',
    },
    {
      blockId: randomUUID(),
      startMs: 1000,
      endMs: 2000,
      startLabel: '00:01',
      endLabel: '00:02',
      text: `Sanitized asset link: ${assetLink}`,
      speaker: null,
    },
  ];
}

export async function parseVideoIntelligencePayload(
  raw: VideoIngressRawData,
): Promise<VideoIntelligenceParseResult> {
  const assetLink = raw.asset_link?.trim() ?? null;
  const locale = raw.locale?.trim() ?? null;
  const title = raw.title?.trim() || inferTitle(assetLink) || 'Untitled Video Asset';
  const ingestedAt = new Date().toISOString();

  let timeline: VideoTimelineBlock[] = [];
  let parserMode: VideoContextMetadata['parserMode'] = 'transcript_direct';

  if (raw.transcript && raw.transcript.length > 0) {
    timeline = blocksFromTranscript(raw.transcript, title, assetLink, locale);
    parserMode = 'transcript_direct';
  } else if (assetLink) {
    const geminiBlocks = await parseAssetLinkWithGemini(assetLink, title, locale);
    if (geminiBlocks && geminiBlocks.length > 0) {
      timeline = geminiBlocks;
      parserMode = 'asset_link_gemini';
    } else {
      timeline = skeletonBlocksFromAssetLink(assetLink, title);
      parserMode = 'asset_link_skeleton';
    }
  }

  const summary = summarizeBlocks(timeline, assetLink);
  const metadata = buildMetadata(timeline, title, assetLink, locale, parserMode, summary);
  const markdownDocument = formatVideoIntelligenceMarkdown(metadata, timeline, ingestedAt);

  return { timeline, metadata, markdownDocument };
}

function inferTitle(assetLink: string | null): string | null {
  if (!assetLink) return null;
  try {
    const url = new URL(assetLink);
    const slug = url.pathname.split('/').filter(Boolean).pop();
    if (!slug) return null;
    return decodeURIComponent(slug.replace(/[-_]+/g, ' '));
  } catch {
    return null;
  }
}
