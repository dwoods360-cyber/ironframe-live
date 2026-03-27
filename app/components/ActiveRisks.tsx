import prisma from "@/lib/prisma";
import ActiveRisksClient from './ActiveRisksClient';

// Baseline seed titles to exclude (full purge / waiting-state flow)
const EXCLUDED_BASELINE_RISK_TITLES = new Set([
  'Schneider Electric SCADA Vulnerability',
  'Azure Health API Exposure',
  'Palo Alto Firewall Misconfiguration',
]);

export default async function ActiveRisks() {
  // 1. Fetch live Zero-Debt Data directly from the Core Vault.
  // Select only columns that exist (omit isSimulation so UI renders if column is missing).
  const [risks, threatEvents] = await Promise.all([
    prisma.activeRisk.findMany({
      select: {
        id: true,
        company_id: true,
        title: true,
        status: true,
        assigneeId: true,
        score_cents: true,
        source: true,
        company: { select: { name: true, sector: true } },
      },
      orderBy: {
        score_cents: 'desc',
      },
    }),
    prisma.threatEvent.findMany({
      select: {
        id: true,
        title: true,
        sourceAgent: true,
        updatedAt: true,
        assigneeId: true,
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

  // Exclude baseline purge titles so they never appear in ACTIVE RISKS
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
  for (const t of threatEvents) {
    assigneeByThreatEventId.set(t.id, t.assigneeId);
  }

  // Serialize for client (BigInt -> string, etc.); default isSimulation to false when column not selected
  const serialized = filteredRisks.map((risk) => {
    const threatId =
      threatByCompositeKey.get(`${normalize(risk.title)}::${normalize(risk.source)}`) ??
      threatByTitle.get(normalize(risk.title)) ??
      null;
    const teAssignee = threatId ? assigneeByThreatEventId.get(threatId) ?? null : null;
    const mergedAssignee = risk.assigneeId ?? teAssignee;
    const assigneeStr =
      mergedAssignee != null && String(mergedAssignee).trim() !== ''
        ? String(mergedAssignee).trim()
        : undefined;
    return {
      id: risk.id.toString(),
      title: risk.title,
      source: risk.source,
      assigneeId: assigneeStr,
      threatId,
      score_cents: Number(risk.score_cents),
      company: { name: risk.company.name, sector: risk.company.sector },
      isSimulation: false,
    };
  });

  const threatEventsForClient = threatEvents.map((t) => ({
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

  return <ActiveRisksClient risks={serialized} threatEvents={threatEventsForClient} />;
}
