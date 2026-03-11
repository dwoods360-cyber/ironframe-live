import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { acknowledgeThreatAction } from '@/app/actions/threatActions';
import { grcGatePass } from '@/app/utils/grcGate';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const threatId = typeof body.threatId === 'string' ? body.threatId.trim() : null;
    const tenantId = typeof body.tenantId === 'string' ? body.tenantId.trim() : null;
    const justification = typeof body.justification === 'string' ? body.justification : undefined;
    const operatorId = typeof body.operatorId === 'string' ? body.operatorId.trim() : 'api-user';

    if (!threatId) {
      return NextResponse.json(
        { error: 'Missing threatId in request body.' },
        { status: 400 }
      );
    }
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Missing tenantId in request body. Zero-Trust violation.' },
        { status: 400 }
      );
    }

    const threat = await prisma.threatEvent.findUnique({
      where: { id: threatId },
      select: { financialRisk_cents: true },
    });

    if (!threat) {
      return NextResponse.json(
        { error: 'Threat not found.' },
        { status: 404 }
      );
    }

    const cents = BigInt(threat.financialRisk_cents ?? 0);
    if (!grcGatePass(cents, justification ?? '')) {
      return NextResponse.json(
        { error: 'GRC Violation: High-value threats require a 50+ character justification.' },
        { status: 400 }
      );
    }

    const result = await acknowledgeThreatAction(threatId, tenantId, operatorId, justification);

    if (result && typeof result === 'object' && 'success' in result && result.success === false) {
      return NextResponse.json(
        { error: (result as { error?: string }).error ?? 'Acknowledge failed.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[api/threats/ingest]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
