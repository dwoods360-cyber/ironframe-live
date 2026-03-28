import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import prisma from '@/lib/prisma';

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
      // LKG: no separate Operator/User join — actor display names live in AuditLog.justification JSON for ASSIGNMENT_CHANGED.
      prisma.threatEvent.findMany({
        select: {
          id: true,
          title: true,
          sourceAgent: true,
          createdAt: true,
          updatedAt: true,
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

    const assigneeByThreatEventId = new Map<string, string | null>();
    const ingestionDetailsByThreatId = new Map<string, string | null>();
    const ttlSecondsByThreatId = new Map<string, number>();
    const threatCreatedAtByThreatId = new Map<string, string>();
    for (const t of threatEvents) {
      assigneeByThreatEventId.set(t.id, t.assigneeId);
      ingestionDetailsByThreatId.set(t.id, t.ingestionDetails);
      ttlSecondsByThreatId.set(t.id, t.ttlSeconds);
      threatCreatedAtByThreatId.set(t.id, t.createdAt.toISOString());
    }

    const serializedRisks = filteredRisks.map((risk) => {
      const threatId =
        threatByCompositeKey.get(`${normalize(risk.title)}::${normalize(risk.source)}`) ??
        threatByTitle.get(normalize(risk.title)) ??
        null;
      const teAssignee = threatId ? assigneeByThreatEventId.get(threatId) ?? null : null;
      const merged = risk.assigneeId ?? teAssignee;
      const assigneeId =
        merged != null && String(merged).trim() !== '' ? String(merged).trim() : undefined;
      const ingestionDetails =
        threatId != null ? ingestionDetailsByThreatId.get(threatId) ?? undefined : undefined;
      const ttlSeconds =
        threatId != null ? ttlSecondsByThreatId.get(threatId) : undefined;
      const threatCreatedAt =
        threatId != null ? threatCreatedAtByThreatId.get(threatId) : undefined;
      return {
        id: risk.id.toString(),
        title: risk.title,
        source: risk.source,
        assigneeId,
        threatId,
        score_cents: risk.score_cents,
        company: { name: risk.company.name, sector: risk.company.sector },
        isSimulation: risk.isSimulation,
        ...(ingestionDetails != null ? { ingestionDetails } : {}),
        ...(ttlSeconds !== undefined ? { ttlSeconds } : {}),
        ...(threatCreatedAt !== undefined ? { threatCreatedAt } : {}),
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
