import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const EXCLUDED_BASELINE_RISK_TITLES = new Set([
  'Schneider Electric SCADA Vulnerability',
  'Azure Health API Exposure',
  'Palo Alto Firewall Misconfiguration',
]);

// TAS-COMPLIANT: Safely serializes BigInt to exact Strings to prevent floating-point drift
const serializeBigInt = (obj: unknown): unknown => {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
};

/** GET /api/dashboard — tenant-scoped data for the dashboard. Requires x-tenant-id header (UUID). */
export async function GET(request: NextRequest) {
  try {
    const activeTenantUuid = request.headers.get('x-tenant-id')?.trim() || null;

    if (!activeTenantUuid) {
      return NextResponse.json(
        { error: 'Tenant context required. Send x-tenant-id header (tenant UUID).' },
        { status: 401 }
      );
    }

    const [companies, serverAuditLogs, risks, threatEvents] = await prisma.$transaction([
      prisma.company.findMany({
        where: { tenantId: activeTenantUuid },
        include: {
          policies: true,
          risks: true,
        },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: { id: true, action: true, operatorId: true, createdAt: true, threatId: true },
      }),
      prisma.activeRisk.findMany({
        where: { company: { tenantId: activeTenantUuid } },
        select: {
          id: true,
          company_id: true,
          title: true,
          status: true,
          assigneeId: true,
          score_cents: true,
          source: true,
          isSimulation: true,
          company: { select: { name: true, sector: true } },
        },
        orderBy: { score_cents: 'desc' },
      }),
      prisma.threatEvent.findMany({
        select: { id: true, title: true, sourceAgent: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const filteredRisks = risks.filter((r) => !EXCLUDED_BASELINE_RISK_TITLES.has(r.title));
    const normalize = (value: string) => value.trim().toLowerCase();
    const threatByCompositeKey = new Map<string, string>();
    for (const t of threatEvents) {
      const key = `${normalize(t.title)}::${normalize(t.sourceAgent)}`;
      if (!threatByCompositeKey.has(key)) {
        threatByCompositeKey.set(key, t.id);
      }
    }
    const threatByTitle = new Map<string, string>();
    for (const t of threatEvents) {
      const key = normalize(t.title);
      if (!threatByTitle.has(key)) {
        threatByTitle.set(key, t.id);
      }
    }

    const serializedRisks = filteredRisks.map((risk) => ({
      id: risk.id.toString(),
      title: risk.title,
      source: risk.source,
      assigneeId: risk.assigneeId,
      threatId:
        threatByCompositeKey.get(`${normalize(risk.title)}::${normalize(risk.source)}`) ??
        threatByTitle.get(normalize(risk.title)) ??
        null,
      score_cents: risk.score_cents,
      company: { name: risk.company.name, sector: risk.company.sector },
      isSimulation: risk.isSimulation,
    }));

    const serializedCompanies = companies.map((c) => ({
      ...c,
      id: c.id,
      industry_avg_loss_cents: c.industry_avg_loss_cents ?? null,
      infrastructure_val_cents: c.infrastructure_val_cents ?? null,
    }));

    const data = {
      companies: serializedCompanies,
      serverAuditLogs: serverAuditLogs.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
      risks: serializedRisks,
    };
    return NextResponse.json(serializeBigInt(data));
  } catch (e) {
    console.error('[api/dashboard]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
