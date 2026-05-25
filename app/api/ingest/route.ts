import { NextResponse } from "next/server";
import { handleCanonicalRawSignalPayload } from '@/app/api/ingestion/canonicalRawSignal';

/**
 * Legacy path — delegates to the same pipeline as `POST /api/ingestion/raw-signal`.
 * Prefer the canonical URL for new integrations.
 */
export async function POST(request: Request) {
  try {
    // Epic 14 ingress interceptor path — sanitize payload before it reaches Irongate validation.
    const rawBody = await request.json();
    return handleCanonicalRawSignalPayload(rawBody);
  } catch {
    return NextResponse.json(
      { error: 'Internal Ingress Error: Malformed Payload' },
      { status: 500 },
    );
  }
}
