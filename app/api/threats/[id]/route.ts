import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const threatDetailSelect = {
  id: true,
  title: true,
  status: true,
  financialRisk_cents: true,
  targetEntity: true,
  sourceAgent: true,
  score: true,
  aiReport: true,
  ingestionDetails: true,
  ttlSeconds: true,
  assigneeId: true,
  deAckReason: true,
  createdAt: true,
  updatedAt: true,
  tenantCompanyId: true,
  notes: {
    orderBy: { createdAt: 'desc' as const },
    select: { id: true, text: true, operatorId: true, createdAt: true },
  },
  auditTrail: {
    orderBy: { createdAt: 'desc' as const },
    select: {
      id: true,
      action: true,
      operatorId: true,
      createdAt: true,
      justification: true,
    },
  },
} as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const threat = await prisma.threatEvent.findUnique({
      where: { id },
      select: threatDetailSelect,
    });
    if (!threat) {
      return NextResponse.json({ error: 'Threat not found' }, { status: 404 });
    }
    const payload = JSON.parse(
      JSON.stringify(threat, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );
    return NextResponse.json(payload);
  } catch (e) {
    console.error('[api/threats/[id]]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
