import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { unstable_noStore as noStore } from 'next/cache';
import prisma from '@/lib/prisma';
import { getCompanyIdForActiveTenant } from '@/app/lib/grc/clearanceThreatResolve';

export const dynamic = 'force-dynamic';

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

/** SimThreatEvent mirrors ThreatEvent scalars but has no WorkNote / AuditLog FK graph. */
const simThreatDetailSelect = {
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
} as const;

type ProdThreatDetail = Prisma.ThreatEventGetPayload<{ select: typeof threatDetailSelect }>;
type SimThreatScalars = Prisma.SimThreatEventGetPayload<{ select: typeof simThreatDetailSelect }>;
type ApiThreatDetail =
  | ProdThreatDetail
  | (SimThreatScalars & { notes: []; auditTrail: [] });

function serializeThreatPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(payload, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    ),
  ) as Record<string, unknown>;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  noStore();
  try {
    const tenantCompanyId = await getCompanyIdForActiveTenant();

    let threatRow: ApiThreatDetail | null = null;
    let isSimulation = false;

    if (tenantCompanyId != null) {
      const prod = await prisma.threatEvent.findFirst({
        where: { id, tenantCompanyId },
        select: threatDetailSelect,
      });
      if (prod) {
        threatRow = prod;
      } else {
        const sim = await prisma.simThreatEvent.findFirst({
          where: { id, tenantCompanyId },
          select: simThreatDetailSelect,
        });
        if (sim) {
          isSimulation = true;
          threatRow = { ...sim, notes: [], auditTrail: [] };
        }
      }
    } else {
      const prod = await prisma.threatEvent.findUnique({
        where: { id },
        select: threatDetailSelect,
      });
      if (prod) {
        threatRow = prod;
      } else {
        const sim = await prisma.simThreatEvent.findUnique({
          where: { id },
          select: simThreatDetailSelect,
        });
        if (sim) {
          isSimulation = true;
          threatRow = { ...sim, notes: [], auditTrail: [] };
        }
      }
    }

    if (!threatRow) {
      return NextResponse.json({ error: 'Threat not found' }, { status: 404 });
    }

    const statusStr = String(threatRow.status);
    const payload = {
      ...threatRow,
      isSimulation,
      state: statusStr,
    };

    return NextResponse.json(serializeThreatPayload(payload as Record<string, unknown>));
  } catch (e) {
    console.error('[api/threats/[id]]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
