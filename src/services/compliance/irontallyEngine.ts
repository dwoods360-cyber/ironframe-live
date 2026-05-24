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
import type { FrameworkReadinessSummary } from "@/app/types/irontallyReadiness";

function normalizeAuditLogRow(row: {
  id: string;
  action: string;
  threatId: string | null;
  justification: string | null;
  createdAt: Date;
}): AuditLogRow {
  return {
    id: row.id,
    action: row.action,
    threatId: row.threatId,
    justification: row.justification,
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
  };
}

export async function compileFrameworkReadiness(tenantId: string): Promise<FrameworkReadinessSummary[]> {
  const trimmedTenantId = tenantId.trim();
  if (!trimmedTenantId) {
    throw new Error("IRONTALLY: tenantId is required for framework readiness compilation.");
  }

  let activeLogs: AuditLogRow[];

  try {
    const rows = await prisma.auditLog.findMany({
      where: {
        isSimulation: false,
        action: { in: [...IRONTALLY_EVIDENCE_AUDIT_ACTIONS] },
        OR: [{ tenantId: trimmedTenantId }, { governance_tenant_uuid: trimmedTenantId }],
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
    activeLogs = rows.map(normalizeAuditLogRow);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`IRONTALLY: AuditLog query failed for tenant ${trimmedTenantId}: ${message}`);
  }

  try {
    return compileReadinessFromLogRows(activeLogs);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`IRONTALLY: readiness rollup failed for tenant ${trimmedTenantId}: ${message}`);
  }
}
