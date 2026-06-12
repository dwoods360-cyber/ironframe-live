import {
  VIDEO_INTELLIGENCE_METRIC_TAG,
  type VideoContextMetadata,
  type VideoTimelineBlock,
} from '../../types/videoIngress.js';
import { formatTimecodeLabel } from './videoTimecode.js';

export function formatVideoIntelligenceMarkdown(
  metadata: VideoContextMetadata,
  timeline: VideoTimelineBlock[],
  ingestedAt: string,
): string {
  const lines: string[] = [
    `# Video Intelligence: ${metadata.title}`,
    '',
    `**Metric tag:** \`${VIDEO_INTELLIGENCE_METRIC_TAG}\``,
    `**Ingested:** ${ingestedAt}`,
    `**Parser mode:** ${metadata.parserMode}`,
    `**Duration:** ${formatTimecodeLabel(metadata.durationMs)} (${metadata.durationMs} ms)`,
    `**Blocks:** ${metadata.blockCount}`,
  ];

  if (metadata.assetLink) {
    lines.push(`**Asset link:** ${metadata.assetLink}`);
  }
  if (metadata.locale) {
    lines.push(`**Locale:** ${metadata.locale}`);
  }

  lines.push('', '## Contextual Metadata Summary', '', metadata.summary, '', '## Timeline', '');

  for (const block of timeline) {
    const speaker = block.speaker ? ` · ${block.speaker}` : '';
    lines.push(
      `### [${block.startLabel} → ${block.endLabel}]${speaker}`,
      '',
      block.text.trim(),
      '',
    );
  }

  return lines.join('\n').trim();
}
