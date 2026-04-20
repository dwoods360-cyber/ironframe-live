/**
 * Shared Prisma query for the Active board — used by Server Actions and GET /api/threats/active.
 */
import prisma from "@/lib/prisma";
import { readSimulationPlaneEnabled } from "@/app/lib/security/ingressGateway";
import type { Prisma } from "@prisma/client";
import { ThreatState } from "@prisma/client";

const CENTS_PER_MILLION = 100_000_000;

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
    where: { action: "ASSIGNMENT_CHANGED" as const },
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      action: true,
      justification: true,
      operatorId: true,
      createdAt: true,
    },
  },
} satisfies Prisma.ThreatEventSelect;

export type ActiveThreatEventRow = Prisma.ThreatEventGetPayload<{
  select: typeof activeThreatBoardSelect;
}>;

/** SimThreatEvent has no WorkNote / AuditLog relations — scalars only (same board mapper, empty history). */
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
} satisfies Prisma.SimThreatEventSelect;

export type SimActiveThreatEventRow = Prisma.SimThreatEventGetPayload<{
  select: typeof simActiveThreatBoardSelect;
}>;

export type ActiveBoardUnionRow = ActiveThreatEventRow | SimActiveThreatEventRow;

/**
 * Main Ops active board: only in-flight workflow states used by ThreatEvent.
 * This prevents board flooding from `PIPELINE`/`DE_ACKNOWLEDGED` rows while keeping live work visible.
 */
export function getActiveThreatWhereClause(): Prisma.ThreatEventWhereInput {
  return {
    status: {
      in: [
        ThreatState.ACTIVE,
        ThreatState.CONFIRMED,
        ThreatState.ESCALATED,
        ThreatState.PENDING_REMOTE_INTERVENTION,
      ],
    },
  };
}

export async function findActiveThreatEventRowsForBoard(): Promise<ActiveBoardUnionRow[]> {
  const sim = await readSimulationPlaneEnabled();
  if (sim) {
    return prisma.simThreatEvent.findMany({
      where: getActiveThreatWhereClause() as Prisma.SimThreatEventWhereInput,
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
      "auditTrail" in r && Array.isArray(r.auditTrail) ? r.auditTrail : [];
    const notes = "notes" in r && Array.isArray(r.notes) ? r.notes : [];
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
      ingestionDetails: r.ingestionDetails ?? undefined,
      ttlSeconds: r.ttlSeconds,
      threatStatus: String(r.status),
      isRemoteAccessAuthorized: r.isRemoteAccessAuthorized,
      remoteTechId: r.remoteTechId ?? null,
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
};

/** Includes only active workflow states (no pipeline/history flooding). */
export async function queryActiveThreatsForBoard(): Promise<PipelineThreatFromDb[]> {
  const rows = await findActiveThreatEventRowsForBoard();
  return mapThreatEventRowsToPipelineThreatFromDb(rows);
}
