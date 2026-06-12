import type { Request, Response } from 'express';
import { processVideoIrongateIngress } from '../../services/ingress/irongateVideoIngress.js';
import { parseVideoIntelligencePayload } from '../../services/ingress/videoMultimodalParser.js';
import { persistVideoIntelligenceDocument } from '../../services/crm/videoIntelligenceStore.js';
import { VIDEO_INTELLIGENCE_METRIC_TAG } from '../../types/videoIngress.js';

type VideoIngressBody = {
  tenant_id?: string;
  tenantId?: string;
  source_type?: string;
  asset_link?: string;
  assetLink?: string;
  transcript?: unknown;
  title?: string;
  locale?: string;
};

function normalizeIngressBody(body: VideoIngressBody): unknown {
  const tenantId = String(body.tenant_id ?? body.tenantId ?? '').trim();
  const assetLink = String(body.asset_link ?? body.assetLink ?? '').trim();

  return {
    tenant_id: tenantId || undefined,
    source_type: body.source_type ?? 'VIDEO_INGRESS',
    raw_data: {
      asset_link: assetLink || undefined,
      transcript: body.transcript,
      title: body.title,
      locale: body.locale,
    },
  };
}

/**
 * POST /api/ingress/video
 * Secure video pre-processing ingress — Irongate DMZ → multimodal parse → CRM persistence.
 */
export async function handleVideoIngress(req: Request, res: Response): Promise<void> {
  const gate = await processVideoIrongateIngress(normalizeIngressBody(req.body ?? {}));

  if (gate.status === 'QUARANTINED') {
    res.status(422).json({
      status: 'QUARANTINED',
      trace_id: gate.trace_id,
      reason: gate.reason,
      agent: 'Irongate-Agent-14',
    });
    return;
  }

  const { envelope, trace_id } = gate;

  try {
    const parsed = await parseVideoIntelligencePayload(envelope.raw_data);
    const stored = await persistVideoIntelligenceDocument(
      envelope.tenant_id,
      trace_id,
      parsed,
    );

    res.status(201).json({
      status: 'CLEAN',
      trace_id,
      metricTag: VIDEO_INTELLIGENCE_METRIC_TAG,
      interactionId: stored.interactionId,
      ingestedAt: stored.ingestedAt,
      blockCount: parsed.metadata.blockCount,
      durationMs: parsed.metadata.durationMs,
      parserMode: parsed.metadata.parserMode,
      markdownDocument: parsed.markdownDocument,
      timeline: parsed.timeline,
      metadata: parsed.metadata,
    });
  } catch (err) {
    console.error('[IRONBOARD VIDEO INGRESS]', err);
    res.status(500).json({
      status: 'ERROR',
      trace_id,
      error: err instanceof Error ? err.message : 'Video ingress failed',
    });
  }
}
