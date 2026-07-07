import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { ironleadsIngressSchema } from '@/app/lib/ingress/ironleadsIngressSchema';
import { ingestIronleadsLead } from '@/app/lib/server/ironleadsIngressCore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatZodError(err: ZodError): { path: string; message: string }[] {
  return err.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

/**
 * POST /api/v1/ingress/ironleads
 * Signed perimeter ingress for Ironleads sanitized OSINT payloads → SUSPECT CRM queue.
 */
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.IRONLEADS_INGRESS_SECRET?.trim();
    if (!secret) {
      return NextResponse.json({ error: 'IRONLEADS_INGRESS_UNCONFIGURED' }, { status: 503 });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'UNAUTHORIZED_PERIMETER_VIOLATION' }, { status: 401 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'INVALID_JSON_BODY' }, { status: 400 });
    }

    let parsed;
    try {
      parsed = ironleadsIngressSchema.parse(rawBody);
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: 'INVALID_INGRESS_GEOMETRY', issues: formatZodError(err) },
          { status: 400 },
        );
      }
      throw err;
    }

    const result = await ingestIronleadsLead(parsed);

    return NextResponse.json(
      {
        success: true,
        message: 'PERIMETER_INGRESS_COMPLETE',
        tenantId: result.tenantId,
        contactId: result.contact.id,
        dealId: result.deal.id,
        priorityScore: result.contact.priorityScore,
        vulnerabilityClass: result.contact.vulnerabilityClass,
        stage: result.deal.stage,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'INTERNAL_INGRESS_FAULT';
    if (message.startsWith('TARGET_TENANT_NOT_FOUND')) {
      return NextResponse.json({ error: 'TARGET_TENANT_NOT_FOUND' }, { status: 404 });
    }
    console.error('IRONLEADS_INGRESS_CRASH_LOGGED:', error);
    return NextResponse.json({ error: 'INTERNAL_INGRESS_FAULT' }, { status: 500 });
  }
}
