import prisma from "@/lib/prisma";
import { getCompanyIdsForTenantUuid } from "@/app/lib/grc/clearanceThreatResolve";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { findActiveThreatEventRowsForBoard } from "@/app/utils/activeThreatsBoardQuery";
import ActiveRisksClient from './ActiveRisksClient';

// Baseline seed titles to exclude (full purge / waiting-state flow)
const EXCLUDED_BASELINE_RISK_TITLES = new Set([
  'Schneider Electric SCADA Vulnerability',
  'Azure Health API Exposure',
  'Palo Alto Firewall Misconfiguration',
]);

export default async function ActiveRisks() {
  const tenantUuid = (await getActiveTenantUuidFromCookies())?.trim() ?? "";
  if (!tenantUuid) {
    return <ActiveRisksClient risks={[]} threatEvents={[]} />;
  }

  const companyIds = await getCompanyIdsForTenantUuid(tenantUuid);
  if (companyIds.length === 0) {
    return <ActiveRisksClient risks={[]} threatEvents={[]} />;
  }

  // Tenant-scoped reads only — canvas stays blank until verified ingress (sim / manual / agent).
  const [risks, threatEventRows] = await Promise.all([
    prisma.activeRisk.findMany({
      where: {
        company: { tenantId: tenantUuid },
        /** Legacy `active_risks` rows only when explicitly flagged as simulation ingress. */
        isSimulation: true,
      },
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
    findActiveThreatEventRowsForBoard(tenantUuid),
  ]);

  // Exclude baseline purge titles so they never appear in ACTIVE RISKS
  const filteredRisks = risks.filter((r) => !EXCLUDED_BASELINE_RISK_TITLES.has(r.title));

  const normalize = (value: string) => value.trim().toLowerCase();
  /** Only link ActiveRisk → ThreatEvent when the match is unambiguous (one row per key). */
  const threatsByCompositeKey = new Map<string, string[]>();
  for (const t of threatEventRows) {
    const key = `${normalize(t.title)}::${normalize(t.sourceAgent)}`;
    const arr = threatsByCompositeKey.get(key) ?? [];
    arr.push(t.id);
    threatsByCompositeKey.set(key, arr);
  }
  const threatsByTitle = new Map<string, string[]>();
  for (const t of threatEventRows) {
    const key = normalize(t.title);
    const arr = threatsByTitle.get(key) ?? [];
    arr.push(t.id);
    threatsByTitle.set(key, arr);
  }

  const assigneeByThreatEventId = new Map<string, string | null>();
  for (const t of threatEventRows) {
    assigneeByThreatEventId.set(t.id, t.assigneeId);
  }

  const resolveLinkedThreatId = (title: string, source: string): string | null => {
    const composite = threatsByCompositeKey.get(`${normalize(title)}::${normalize(source)}`);
    if (composite?.length === 1) return composite[0]!;
    const byTitle = threatsByTitle.get(normalize(title));
    if (byTitle?.length === 1) return byTitle[0]!;
    return null;
  };

  // Serialize for client (BigInt -> string, etc.)
  const serialized = filteredRisks.map((risk) => {
    const threatId = resolveLinkedThreatId(risk.title, risk.source);
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
      isSimulation: true,
    };
  });

  const threatEventsForClient = threatEventRows.map((t) => {
    const auditTrail =
      "auditTrail" in t && Array.isArray(t.auditTrail)
        ? t.auditTrail
        : "AuditLog" in t && Array.isArray(t.AuditLog)
          ? t.AuditLog
          : [];
    return {
      id: t.id,
      title: t.title,
      sourceAgent: t.sourceAgent,
      assigneeId: t.assigneeId ?? null,
      assignmentHistory: auditTrail.map((log) => ({
        id: log.id,
        action: log.action,
        justification: log.justification,
        operatorId: log.operatorId,
        createdAt: log.createdAt.toISOString(),
      })),
    };
  });

  return <ActiveRisksClient risks={serialized} threatEvents={threatEventsForClient} />;
}
