import { NextResponse } from 'next/server';
import { IronGate } from '@/src/services/agents/irongate';
import { IronCore } from '@/src/services/agents/ironcore';
import {
  ingressSanitizerFailureResponse,
  sanitizeIngressPayload,
} from '@/app/lib/ironethic/ingressSanitizer';

const TRACE_PAYLOAD_KEY = '__ironframe_trace_id';

/**
 * Single implementation: Irongate (14) → Ironcore (1). Non-CLEAN ingress returns 403 Forbidden.
 */
export async function handleCanonicalRawSignalPayload(rawBody: unknown): Promise<Response> {
  try {
    // Epic 14: sanitize sensitive identity fields before any Irongate schema validation.
    const sanitizedBody = sanitizeIngressPayload(rawBody);

    const ingressResult = await IronGate.processIngress(sanitizedBody);

    if (ingressResult.status !== 'CLEAN') {
      return NextResponse.json(
        {
          error:
            'Forbidden: signal did not achieve Irongate (Agent 14) CLEAN status. Bypass denied.',
          trace_id: ingressResult.trace_id,
        },
        { status: 403 },
      );
    }

    const ingested = await IronGate.ingest(sanitizedBody);
    const routed = await IronCore.routeToAgents({
      tenantId: ingested.tenant_id,
      sanitizedPayload: ingested.data as Record<string, unknown>,
      traceId: ingressResult.trace_id,
    });

    const data = ingested.data as Record<string, unknown>;
    const card = {
      trace_id: ingressResult.trace_id,
      tenant_id: ingested.tenant_id,
      title: String(
        data.title ?? data.signal_title ?? data.name ?? 'Sanitized signal',
      ),
      summary: typeof data.summary === 'string' ? data.summary : undefined,
      sanitized: ingested.data,
      routing: {
        current_agent: routed.current_agent,
        agent_logs: routed.agent_logs ?? [],
        status: routed.status,
      },
    };

    return NextResponse.json(
      {
        message: 'Payload verified, sanitized, and routed by Ironcore (Agent 1).',
        status: 'CLEAN',
        card,
      },
      { status: 200 },
    );
  } catch (err) {
    const pepperFailure = ingressSanitizerFailureResponse(err);
    if (pepperFailure) {
      return NextResponse.json(pepperFailure.body, { status: pepperFailure.status });
    }
    if (err instanceof Error && err.message.includes('IRONGATE_BLOCK')) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: 'Internal Ingress Error: Malformed Payload' },
      { status: 500 },
    );
  }
}

export async function handleCanonicalRawSignalPost(request: Request): Promise<Response> {
  try {
    const rawBody = await request.json();
    return handleCanonicalRawSignalPayload(rawBody);
  } catch {
    return NextResponse.json(
      { error: 'Internal Ingress Error: Malformed Payload' },
      { status: 500 },
    );
  }
}

export { TRACE_PAYLOAD_KEY };
