import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const threat = await prisma.threatEvent.findUnique({
      where: { id },
      include: {
        notes: { orderBy: { createdAt: 'desc' } },
        auditTrail: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!threat) {
      return NextResponse.json({ error: 'Threat not found' }, { status: 404 });
    }
    return NextResponse.json({
      ...threat,
      financialRisk_cents: Number(threat.financialRisk_cents),
      notes: threat.notes.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
      })),
      auditTrail: threat.auditTrail.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      })),
      createdAt: threat.createdAt.toISOString(),
      updatedAt: threat.updatedAt.toISOString(),
    });
  } catch (e) {
    console.error('[api/threats/[id]]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
