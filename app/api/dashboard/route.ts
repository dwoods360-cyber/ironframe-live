import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const EXCLUDED_BASELINE_RISK_TITLES = new Set([
  'Schneider Electric SCADA Vulnerability',
  'Azure Health API Exposure',
  'Palo Alto Firewall Misconfiguration',
]);

/** GET /api/dashboard — data for the dashboard page when rendered as a client component */
export async function GET() {
  try {
    const [companies, serverAuditLogs, risks, threatEvents] = await Promise.all([
      prisma.company.findMany({
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
        select: {
          id: true,
          company_id: true,
          title: true,
          status: true,
          score_cents: true,
          source: true,
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
      threatId:
        threatByCompositeKey.get(`${normalize(risk.title)}::${normalize(risk.source)}`) ??
        threatByTitle.get(normalize(risk.title)) ??
        null,
      score_cents: Number(risk.score_cents),
      company: { name: risk.company.name, sector: risk.company.sector },
      isSimulation: false,
    }));

    const serializedCompanies = companies.map((c) => ({
      ...c,
      industry_avg_loss_cents: c.industry_avg_loss_cents != null ? Number(c.industry_avg_loss_cents) : null,
    }));

    return NextResponse.json({
      companies: serializedCompanies,
      serverAuditLogs: serverAuditLogs.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
      risks: serializedRisks,
    });
  } catch (e) {
    console.error('[api/dashboard]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
