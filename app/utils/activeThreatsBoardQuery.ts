/**
 * Shared Prisma query for the Active board — used by Server Actions and GET /api/threats/active.
 */
import prisma from "@/lib/prisma";
import { THREAT_ASSIGNEE_AUDIT_ACTIONS } from "@/app/utils/assignmentChainOfCustody";
import { readSimulationPlaneEnabled } from "@/app/lib/security/ingressGateway";
import {
  normalizeIngestionDetailsToString,
  parseIngestionDetailsForMerge,
} from "@/app/utils/ingestionDetailsMerge";
import type { Prisma } from "@prisma/client";
import { ThreatState } from "@prisma/client";

const CENTS_PER_MILLION = 100_000_000;

function parseShadowCisoHandshakeFromIngestionLocal(
  ingestionDetails: string | Prisma.JsonValue | null | undefined,
): {
  resolutionApprovalId: string | null;
  resolutionApprovalStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
} {
  try {
    const j = parseIngestionDetailsForMerge(ingestionDetails ?? null) as {
      shadowCisoHandshake?: {
        resolutionApprovalId?: string;
        resolutionApprovalStatus?: string;
      };
    };
    const h = j?.shadowCisoHandshake;
    const id = typeof h?.resolutionApprovalId === "string" ? h.resolutionApprovalId.trim() : null;
    const st = h?.resolutionApprovalStatus;
    if (id && st === "APPROVED") {
      return { resolutionApprovalId: id, resolutionApprovalStatus: "APPROVED" };
    }
  } catch {
    /* ignore */
  }
  return { resolutionApprovalId: null, resolutionApprovalStatus: null };
}

function centsToMillions(value: bigint | number): number {
  return Number(value) / CENTS_PER_MILLION;
}

/** Stable select shape so `findMany` infers `notes` / `auditTrail` on each row. */
export const activeThreatBoardSelect = {
  id: true,
  title: true,
  status: true,
  isRemoteAccessAuthorized: true,
  remoteTechId: true,
  financialRisk_cents: true,
  score: true,
  targetEntity: true,
  sourceAgent: true,
  createdAt: true,
  assigneeId: true,
  ingestionDetails: true,
  aiReport: true,
  ttlSeconds: true,
  notes: {
    orderBy: { createdAt: "desc" as const },
    select: { text: true, operatorId: true, createdAt: true },
  },
  auditTrail: {
    where: { action: { in: [...THREAT_ASSIGNEE_AUDIT_ACTIONS] } },
    orderBy: { createdAt: "desc" as const },
    select: {
      id: true,
      action: true,
      justification: true,
      operatorId: true,
      createdAt: true,
    },
  },
  agentReasonings: {
    orderBy: { createdAt: "desc" as const },
    select: {
      id: true,
      agentId: true,
      reasoning: true,
      metadata: true,
      createdAt: true,
    },
  },
  resolutionApprovalId: true,
  resolutionApproval: { select: { status: true } },
} satisfies Prisma.ThreatEventSelect;

export type ActiveThreatEventRow = Prisma.ThreatEventGetPayload<{
  select: typeof activeThreatBoardSelect;
}>;

/** Simulation plane: same scalars as prod + assignee audit rows linked via `simThreatId`. */
export const simActiveThreatBoardSelect = {
  id: true,
  title: true,
  status: true,
  isRemoteAccessAuthorized: true,
  remoteTechId: true,
  financialRisk_cents: true,
  score: true,
  targetEntity: true,
  sourceAgent: true,
  createdAt: true,
  assigneeId: true,
  ingestionDetails: true,
  aiReport: true,
  ttlSeconds: true,
  postMortemReportPath: true,
  AuditLog: {
    where: { action: { in: [...THREAT_ASSIGNEE_AUDIT_ACTIONS] } },
    orderBy: { createdAt: "desc" as const },
    select: {
      id: true,
      action: true,
      justification: true,
      operatorId: true,
      createdAt: true,
    },
  },
} satisfies Prisma.RiskEventSelect;

export type SimActiveThreatEventRow = Prisma.RiskEventGetPayload<{
  select: typeof simActiveThreatBoardSelect;
}>;

export type ActiveBoardUnionRow = ActiveThreatEventRow | SimActiveThreatEventRow;

/**
 * Main Ops active board: acknowledged / in-mitigation work (excludes raw `IDENTIFIED` intake and terminal states).
 */
export function getActiveThreatWhereClause(): Prisma.ThreatEventWhereInput {
  return {
    status: { in: [ThreatState.CONFIRMED, ThreatState.MITIGATED] },
  };
}

export async function findActiveThreatEventRowsForBoard(): Promise<ActiveBoardUnionRow[]> {
  const sim = await readSimulationPlaneEnabled();
  if (sim) {
    return prisma.riskEvent.findMany({
      where: getActiveThreatWhereClause() as Prisma.RiskEventWhereInput,
      select: simActiveThreatBoardSelect,
      orderBy: { updatedAt: "desc" },
    });
  }
  return prisma.threatEvent.findMany({
    where: getActiveThreatWhereClause(),
    select: activeThreatBoardSelect,
    orderBy: { updatedAt: "desc" },
  });
}

/** Map Prisma rows (ThreatEvent with relations, or SimThreatEvent scalars) → `PipelineThreatFromDb`. */
export function mapThreatEventRowsToPipelineThreatFromDb(
  rows: readonly ActiveBoardUnionRow[],
): PipelineThreatFromDb[] {
  return rows.map((r) => {
    const liabilityLine = `Liability: $${centsToMillions(r.financialRisk_cents).toFixed(1)}M · ${r.sourceAgent}`;
    const ar = r.aiReport?.trim();
    const auditTrail =
      "auditTrail" in r && Array.isArray(r.auditTrail)
        ? r.auditTrail
        : "AuditLog" in r && Array.isArray(r.AuditLog)
          ? r.AuditLog
          : [];
    const notes = "notes" in r && Array.isArray(r.notes) ? r.notes : [];
    const agentReasonings =
      "agentReasonings" in r && Array.isArray(r.agentReasonings)
        ? r.agentReasonings.map((a) => ({
            id: a.id,
            agentId: a.agentId,
            reasoning: a.reasoning,
            metadata: a.metadata,
            createdAt: a.createdAt.toISOString(),
          }))
        : undefined;
    const shadow = parseShadowCisoHandshakeFromIngestionLocal(r.ingestionDetails);
    let prodResolutionId: string | null = null;
    let prodResolutionStatus: "PENDING" | "APPROVED" | "REJECTED" | null = null;
    if ("resolutionApprovalId" in r) {
      const te = r as ActiveThreatEventRow;
      prodResolutionId = te.resolutionApprovalId ?? null;
      const st = te.resolutionApproval?.status;
      if (st === "APPROVED" || st === "PENDING" || st === "REJECTED") {
        prodResolutionStatus = st;
      }
    }
    return {
      id: r.id,
      name: r.title,
      loss: centsToMillions(r.financialRisk_cents),
      score: r.score,
      industry: r.targetEntity,
      source: r.sourceAgent,
      description: ar && ar.length > 0 ? ar : liabilityLine,
      aiReport: r.aiReport ?? null,
      createdAt: r.createdAt.toISOString(),
      assignedTo: r.assigneeId?.trim() || undefined,
      assignmentHistory: auditTrail.map((log) => ({
        id: log.id,
        action: log.action,
        justification: log.justification,
        operatorId: log.operatorId,
        createdAt: log.createdAt.toISOString(),
      })),
      workNotes: notes.map((n) => ({
        text: n.text,
        user: n.operatorId,
        timestamp: n.createdAt.toISOString(),
      })),
      ingestionDetails: normalizeIngestionDetailsToString(r.ingestionDetails) ?? undefined,
      ttlSeconds: r.ttlSeconds,
      threatStatus: String(r.status),
      isRemoteAccessAuthorized: r.isRemoteAccessAuthorized,
      remoteTechId: r.remoteTechId ?? null,
      agentReasonings,
      resolutionApprovalId: prodResolutionId ?? shadow.resolutionApprovalId,
      resolutionApprovalStatus: prodResolutionId ? prodResolutionStatus : shadow.resolutionApprovalStatus,
      postMortemReportPath:
        "postMortemReportPath" in r
          ? ((r as { postMortemReportPath?: string | null }).postMortemReportPath ?? null)
          : null,
    };
  });
}

export type PipelineThreatFromDb = {
  id: string;
  name: string;
  loss: number;
  score: number;
  industry: string;
  source: string;
  description: string;
  createdAt?: string;
  assignedTo?: string;
  assignmentHistory?: Array<{
    id: string;
    action: string;
    justification: string | null;
    operatorId: string;
    createdAt: string;
  }>;
  workNotes?: { text: string; user: string; timestamp: string }[];
  ingestionDetails?: string | null;
  aiReport?: string | null;
  ttlSeconds?: number | null;
  threatStatus?: string;
  remoteTechId?: string | null;
  isRemoteAccessAuthorized?: boolean;
  dispositionStatus?: string | null;
  isFalsePositive?: boolean;
  receiptHash?: string | null;
  agentReasonings?: Array<{
    id: string;
    agentId: string;
    reasoning: string;
    metadata: unknown;
    createdAt: string;
  }>;
  resolutionApprovalId?: string | null;
  resolutionApprovalStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
  /** Sim plane: post-mortem PDF path after expert Gate 7 resolve. */
  postMortemReportPath?: string | null;
};

/** Includes only active workflow states (no pipeline/history flooding). */
export async function queryActiveThreatsForBoard(): Promise<PipelineThreatFromDb[]> {
  const rows = await findActiveThreatEventRowsForBoard();
  return mapThreatEventRowsToPipelineThreatFromDb(rows);
}
