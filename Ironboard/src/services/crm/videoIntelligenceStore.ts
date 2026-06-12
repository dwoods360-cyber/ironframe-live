import { randomUUID } from 'node:crypto';
import {
  VIDEO_INTELLIGENCE_METRIC_TAG,
  type VideoIntelligenceCrmEnvelope,
  type VideoIntelligenceParseResult,
} from '../../types/videoIngress.js';
import { runIronboardCrmTransaction } from './crmTenantContext.js';

export type VideoIntelligencePersistResult = {
  interactionId: string;
  ingestedAt: string;
  metricTag: typeof VIDEO_INTELLIGENCE_METRIC_TAG;
};

export async function persistVideoIntelligenceDocument(
  tenantId: string,
  traceId: string,
  parsed: VideoIntelligenceParseResult,
): Promise<VideoIntelligencePersistResult> {
  return runIronboardCrmTransaction(tenantId, async (tx, boundTenantId) => {
    const ingestedAt = new Date().toISOString();
    const envelope: VideoIntelligenceCrmEnvelope = {
      metricTag: VIDEO_INTELLIGENCE_METRIC_TAG,
      classification: 'Video Intelligence Update',
      sanitizedBy: 'Irongate-Agent-14',
      ingestedAt,
      traceId,
      tenantId: boundTenantId,
      assetLink: parsed.metadata.assetLink,
      title: parsed.metadata.title,
      markdownDocument: parsed.markdownDocument,
      timeline: parsed.timeline,
      metadata: parsed.metadata,
    };

    const row = await tx.ironboardCrmInteraction.create({
      data: {
        id: randomUUID(),
        tenantId: boundTenantId,
        dealId: null,
        contactId: null,
        channel: 'OTHER',
        summary: JSON.stringify(envelope),
        occurredAt: new Date(ingestedAt),
      },
    });

    return {
      interactionId: row.id,
      ingestedAt,
      metricTag: VIDEO_INTELLIGENCE_METRIC_TAG,
    };
  });
}
