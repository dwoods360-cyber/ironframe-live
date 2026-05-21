/**
 * TAS Section 3 — Irontally Framework Mapping (Agent 19 Core Directive)
 * Epic 16 / Epic 8 — Continuous Auditor-Ready Evidence Compiler
 */
import prisma from "@/lib/prisma";

export type {
  FrameworkReadinessLabel,
  FrameworkReadinessSummary,
  VerifiedEvidenceLog,
} from "@/app/types/irontallyReadiness";

export {
  auditLogSatisfiesDirective,
  compileFrameworkFromLogs,
  compileReadinessFromLogRows,
  inferDirectivesFromAuditLog,
  IRONTALLY_EVIDENCE_AUDIT_ACTIONS,
  READINESS_FRAMEWORKS,
} from "@/src/services/compliance/irontallyReadinessCore";

import {
  compileReadinessFromLogRows,
  IRONTALLY_EVIDENCE_AUDIT_ACTIONS,
  type AuditLogRow,
} from "@/src/services/compliance/irontallyReadinessCore";

export async function compileFrameworkReadiness(tenantId: string) {
  const activeLogs = await prisma.auditLog.findMany({
    where: {
      tenantId,
      isSimulation: false,
      action: { in: [...IRONTALLY_EVIDENCE_AUDIT_ACTIONS] },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      action: true,
      threatId: true,
      justification: true,
      createdAt: true,
    },
  });

  return compileReadinessFromLogRows(activeLogs as AuditLogRow[]);
}
