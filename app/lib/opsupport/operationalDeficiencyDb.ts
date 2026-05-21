import type { PrismaClient } from "@prisma/client";
import {
  OPERATIONAL_DEFICIENCY_REPORT,
  OPERATIONAL_DEFICIENCY_RESOLVED,
  parseReportPayloadFromJsonValue,
  parseResolvedPayloadFromJsonValue,
} from "@/app/lib/opsupport/operationalDeficiencyQueue";

export type OperationalDeficiencyQueueItem = {
  reportId: string;
  /** Row id in `SimulationDiagnosticLog` (shadow-only trail). */
  auditLogId: string;
  threatId: string | null;
  createdAt: string;
  commentPreview: string;
  severityLabel: string;
};

/**
 * Shadow-plane simulation diagnostic log only (`SimulationDiagnosticLog`).
 * Production `AuditLog` / `ThreatEvent` must never carry self-test rows.
 */
export async function loadOperationalDeficiencyQueueState(
  prisma: PrismaClient,
  tenantUuid: string,
  _companyIds: bigint[],
): Promise<{ unresolved: OperationalDeficiencyQueueItem[]; unresolvedCount: number }> {
  const [reports, resolutions] = await Promise.all([
    prisma.simulationDiagnosticLog.findMany({
      where: {
        tenantUuid,
        action: OPERATIONAL_DEFICIENCY_REPORT,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, createdAt: true, payload: true, simThreatId: true, resolvedAt: true },
    }),
    prisma.simulationDiagnosticLog.findMany({
      where: {
        tenantUuid,
        action: OPERATIONAL_DEFICIENCY_RESOLVED,
      },
      orderBy: { createdAt: "desc" },
      take: 400,
      select: { payload: true },
    }),
  ]);

  const resolvedIds = new Set<string>();
  for (const r of resolutions) {
    const p = parseResolvedPayloadFromJsonValue(r.payload);
    if (!p?.resolvesReportId) continue;
    if (p.tenantUuid && p.tenantUuid !== tenantUuid) continue;
    resolvedIds.add(p.resolvesReportId);
  }

  const unresolved: OperationalDeficiencyQueueItem[] = [];
  for (const r of reports) {
    const p = parseReportPayloadFromJsonValue(r.payload);
    if (!p?.reportId) continue;
    if (p.tenantUuid !== tenantUuid) continue;
    if (r.resolvedAt != null) continue;
    if (resolvedIds.has(p.reportId)) continue;
    const severityLabel = p.snapshot?.severityLabel ?? "MEDIUM";
    unresolved.push({
      reportId: p.reportId,
      auditLogId: r.id,
      threatId: r.simThreatId,
      createdAt: r.createdAt.toISOString(),
      commentPreview: p.comment.length > 160 ? `${p.comment.slice(0, 160)}…` : p.comment,
      severityLabel,
    });
  }

  return { unresolved, unresolvedCount: unresolved.length };
}
