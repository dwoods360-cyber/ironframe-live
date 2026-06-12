/**
 * Agent 14 (Irongate) DMZ sanitization for Strategic Intel research ingress.
 * All external manifest bytes pass through strip + schema validation before CRM persistence.
 */
import {
  strategicIntelResearchManifestSchema,
  type StrategicIntelResearchManifest,
} from '../../types/strategicIntelResearch.js';

const SCRIPT_TAG_RE = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
const JS_PROTOCOL_RE = /javascript:/gi;

export function stripIrongateInjectionVectors(raw: string): string {
  return raw.replace(SCRIPT_TAG_RE, '[STRIPPED]').replace(JS_PROTOCOL_RE, '[STRIPPED]');
}

export function sanitizeManifestRecord(raw: unknown): Record<string, unknown> {
  const stringified = JSON.stringify(raw ?? {});
  const clean = stripIrongateInjectionVectors(stringified);
  return JSON.parse(clean) as Record<string, unknown>;
}

export function validateStrategicIntelManifest(raw: unknown): StrategicIntelResearchManifest {
  const sanitized = sanitizeManifestRecord(raw);
  const parsed = strategicIntelResearchManifestSchema.parse(sanitized);
  for (const doc of parsed.documents) {
    for (const key of Object.keys(doc.riskMetricsCents) as Array<
      keyof typeof doc.riskMetricsCents
    >) {
      const value = doc.riskMetricsCents[key];
      if (value.includes('.') || value.includes('e') || value.includes('E')) {
        throw new Error(`IRONGATE_BLOCK: float/scientific notation rejected in ${key}`);
      }
    }
    for (const profile of doc.industryProfiles) {
      if (
        profile.peerAleBaselineCents.includes('.') ||
        profile.peerAleBaselineCents.includes('e')
      ) {
        throw new Error('IRONGATE_BLOCK: peer ALE must be whole-cent integer string');
      }
    }
  }
  return parsed;
}
