import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import prisma from '@/lib/prisma';
import { ThreatState } from '@prisma/client';

/** Never statically cache this route — dashboard must reflect live DB (assignee, risks, logs). */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  noStore();
  try {
    // Touch request headers so the handler stays fully dynamic (tenant + cache-bust behavior).
    void request.headers.get('x-tenant-id');
    void request.headers.get('sec-fetch-mode');

    const activeTenantUuid = request.headers.get('x-tenant-id')?.trim() || null;

    if (!activeTenantUuid) {
      return NextResponse.json(
        { error: 'Tenant context required. Send x-tenant-id header (tenant UUID).' },
        { status: 401 }
      );
    }

    const [companies, serverAuditLogs, threatEvents] = await prisma.$transaction([
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
      // LKG: no separate Operator/User join — actor display names live in AuditLog.justification JSON for ASSIGNMENT_CHANGED.
      prisma.threatEvent.findMany({
        where: {
          status: {
            in: [
              ThreatState.ACTIVE,
              ThreatState.CONFIRMED,
              ThreatState.ESCALATED,
              ThreatState.PENDING_REMOTE_INTERVENTION,
            ],
          },
        },
        select: {
          id: true,
          title: true,
          sourceAgent: true,
          targetEntity: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          tenantCompanyId: true,
          score: true,
          financialRisk_cents: true,
          assigneeId: true,
          ttlSeconds: true,
          ingestionDetails: true,
          auditTrail: {
            where: { action: 'ASSIGNMENT_CHANGED' },
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              action: true,
              justification: true,
              operatorId: true,
              createdAt: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const companyById = new Map(
      companies.map((company) => [company.id.toString(), company] as const),
    );

    // Deterministic linkage: risk rows are sourced from ThreatEvent primary keys.
    const serializedRisks = threatEvents
      .filter((threat) => !EXCLUDED_BASELINE_RISK_TITLES.has(threat.title))
      .map((threat) => {
        const linkedCompany =
          threat.tenantCompanyId != null
            ? companyById.get(threat.tenantCompanyId.toString())
            : undefined;
        const assigneeId =
          threat.assigneeId != null && threat.assigneeId.trim() !== ''
            ? threat.assigneeId.trim()
            : undefined;
        return {
          id: threat.id,
          title: threat.title,
          source: threat.sourceAgent,
          assigneeId,
          threatId: threat.id,
          score_cents: threat.score,
          company: {
            name: linkedCompany?.name ?? threat.targetEntity,
            sector: linkedCompany?.sector ?? threat.targetEntity,
          },
          isSimulation: false,
          ...(threat.ingestionDetails != null ? { ingestionDetails: threat.ingestionDetails } : {}),
          ttlSeconds: threat.ttlSeconds,
          threatCreatedAt: threat.createdAt.toISOString(),
        };
      });

    const serializedCompanies = companies.map((c) => ({
      ...c,
      id: c.id,
      industry_avg_loss_cents: c.industry_avg_loss_cents ?? null,
      infrastructure_val_cents: c.infrastructure_val_cents ?? null,
    }));

    /** ThreatEvent rows with assigneeId + ASSIGNMENT_CHANGED chain-of-custody. */
    const threatEventsPayload = threatEvents.map((t) => ({
      id: t.id,
      title: t.title,
      sourceAgent: t.sourceAgent,
      status: t.status,
      assigneeId: t.assigneeId ?? null,
      assignmentHistory: (t.auditTrail ?? []).map((log) => ({
        id: log.id,
        action: log.action,
        justification: log.justification,
        operatorId: log.operatorId,
        createdAt: log.createdAt.toISOString(),
      })),
    }));

    const data = {
      companies: serializedCompanies,
      serverAuditLogs: serverAuditLogs.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
      risks: serializedRisks,
      threatEvents: threatEventsPayload,
    };
    return NextResponse.json(serializeBigInt(data), {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
      },
    });
  } catch (e) {
    console.error('[api/dashboard]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
