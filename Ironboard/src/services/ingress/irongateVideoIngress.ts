/**
 * Agent 14 (Irongate) — video ingress DMZ gate.
 * All video asset payloads must pass structural validation + injection stripping.
 */
import { randomUUID } from 'node:crypto';
import {
  irongateVideoEnvelopeSchema,
  type IrongateVideoEnvelope,
  type VideoIngressRawData,
} from '../../types/videoIngress.js';
import { stripIrongateInjectionVectors } from '../crm/strategicIntelSanitizer.js';

const TRACKING_PARAM_PREFIXES = ['utm_', 'utm-'];
const TRACKING_PARAM_EXACT = new Set([
  'fbclid',
  'gclid',
  'gclsrc',
  'msclkid',
  'mc_eid',
  'mc_cid',
  '_hsenc',
  '_hsmi',
  'igshid',
  'mkt_tok',
  'ref',
  'ref_src',
  'si',
  'feature',
]);

export type IrongateVideoIngressResult =
  | { status: 'CLEAN'; trace_id: string; envelope: IrongateVideoEnvelope }
  | { status: 'QUARANTINED'; trace_id: string; reason: string };

function sanitizeRecord(raw: unknown): Record<string, unknown> {
  const stringified = JSON.stringify(raw ?? {});
  const clean = stripIrongateInjectionVectors(stringified);
  return JSON.parse(clean) as Record<string, unknown>;
}

/** Strip marketing / session tracking tokens from video asset URLs. */
export function stripTrackingTokensFromUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return rawUrl.trim();
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return rawUrl.trim();
  }

  const next = new URL(parsed.toString());
  for (const key of [...next.searchParams.keys()]) {
    const lower = key.toLowerCase();
    if (TRACKING_PARAM_EXACT.has(lower)) {
      next.searchParams.delete(key);
      continue;
    }
    if (TRACKING_PARAM_PREFIXES.some(prefix => lower.startsWith(prefix))) {
      next.searchParams.delete(key);
    }
  }

  return next.toString();
}

function sanitizeRawData(raw: VideoIngressRawData): VideoIngressRawData {
  const assetLink = raw.asset_link ? stripTrackingTokensFromUrl(raw.asset_link) : undefined;
  const transcript = raw.transcript?.map(cue => ({
    ...cue,
    text: stripIrongateInjectionVectors(cue.text.trim()),
    speaker: cue.speaker ? stripIrongateInjectionVectors(cue.speaker.trim()) : undefined,
    start: cue.start ? stripIrongateInjectionVectors(cue.start.trim()) : undefined,
    end: cue.end ? stripIrongateInjectionVectors(cue.end.trim()) : undefined,
  }));
  const title = raw.title ? stripIrongateInjectionVectors(raw.title.trim()) : undefined;
  const locale = raw.locale ? stripIrongateInjectionVectors(raw.locale.trim()) : undefined;

  return {
    asset_link: assetLink,
    transcript,
    title,
    locale,
  };
}

export async function processVideoIrongateIngress(payload: unknown): Promise<IrongateVideoIngressResult> {
  const trace_id = randomUUID();
  const sanitizedRoot = sanitizeRecord(payload);
  const validation = irongateVideoEnvelopeSchema.safeParse(sanitizedRoot);

  if (!validation.success) {
    await quarantine(payload, 'SCHEMA_VIOLATION', trace_id);
    return { status: 'QUARANTINED', trace_id, reason: 'SCHEMA_VIOLATION' };
  }

  const cleanRaw = sanitizeRawData(validation.data.raw_data);
  const envelope: IrongateVideoEnvelope = {
    tenant_id: validation.data.tenant_id,
    source_type: validation.data.source_type,
    raw_data: cleanRaw,
  };

  return { status: 'CLEAN', trace_id, envelope };
}

async function quarantine(payload: unknown, reason: string, traceId: string): Promise<void> {
  console.error(`[IRONGATE_QUARANTINE][video][${traceId}]: ${reason}`, payload);
}
