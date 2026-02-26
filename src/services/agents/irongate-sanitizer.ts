/**
 * AGENT 14 (IRONGATE) - DATA SANITIZER
 * Core Directive: The absolute perimeter. ALL external ingestion routes here.
 * Mandate: Sanitization, Schema Validation, and Threat Scanning.
 */

import { z } from 'zod';

// 1. Structural Validation Schema (Zero-Trust)
const ExternalPayloadSchema = z.object({
  tenant_id: z.string().uuid(),
  source_type: z.enum(['API', 'WEBHOOK', 'DOC_PARSER']),
  raw_data: z.record(z.any()),
});

export class IronGate {
  /**
   * Sentinel Ingress: The only way data enters the Sovereign State.
   */
  static async ingest(payload: unknown) {
    // A. Validate Structure
    const validation = ExternalPayloadSchema.safeParse(payload);

    if (!validation.success) {
      // B. Failure: Quarantine for Irontech (Agent 11)
      await this.quarantine(payload, 'SCHEMA_VIOLATION');
      throw new Error('IRONGATE_BLOCK: Structural Violation Detected.');
    }

    const { tenant_id, raw_data } = validation.data;

    // C. Sanitization: Strip Potential Injections
    const cleanData = this.sanitize(raw_data);

    return {
      tenant_id,
      data: cleanData,
      status: 'CLEAN',
    };
  }

  private static sanitize(data: Record<string, unknown>): Record<string, unknown> {
    const stringified = JSON.stringify(data);
    // Simple regex for illustration; Agent 14 uses deeper heuristics
    const clean = stringified.replace(/<script.*?>.*?<\/script>/gi, '[STRIPPED]');
    return JSON.parse(clean) as Record<string, unknown>;
  }

  private static async quarantine(payload: unknown, reason: string) {
    // Log to Failed_Jobs for Agent 11 review
    console.error(`[IRONGATE_QUARANTINE]: ${reason}`, payload);
  }
}
