import { NextResponse } from 'next/server';
import { IronGate } from '@/src/services/agents/irongate';

/**
 * SOVEREIGN INGESTION ENDPOINT
 * Status: CONSTITUTIONALLY LOCKED
 * Mandate: ALL external POST requests must pass through Agent 14 (Irongate).
 */
export async function POST(request: Request) {
  try {
    // 1. Parse raw incoming payload
    const rawBody = await request.json();

    // 2. Zero-Trust Handoff: Irongate (Agent 14) takes immediate control
    const ingressResult = await IronGate.processIngress(rawBody);

    // 3. Quarantine Path
    if (ingressResult.status === 'QUARANTINED') {
      return NextResponse.json(
        {
          error: 'Payload quarantined by Irongate (Agent 14). Policy Violation.',
          trace_id: ingressResult.trace_id,
        },
        { status: 400 }
      );
    }

    // 4. Clean Path (Ready for Ironcore / Agent 1 orchestration)
    return NextResponse.json(
      {
        message: 'Payload verified and sanitized.',
        trace_id: ingressResult.trace_id,
        status: 'CLEAN',
      },
      { status: 200 }
    );
  } catch {
    // Failsafe catch for malformed JSON or complete network failure
    return NextResponse.json(
      { error: 'Internal Ingress Error: Malformed Payload' },
      { status: 500 }
    );
  }
}
