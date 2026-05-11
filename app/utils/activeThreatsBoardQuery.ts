/**
 * Shared Prisma query for the Active board — used by Server Actions and GET /api/threats/active.
 */
import prisma from "@/lib/prisma";
import { THREAT_ASSIGNEE_AUDIT_ACTIONS } from "@/app/utils/assignmentChainOfCustody";
import {
  ingressUsesRiskEventTable,
  readSimulationPlaneEnabled,
} from "@/app/lib/security/ingressGateway";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { isShadowPlaneActiveFromEnv } from "@/app/utils/shadowPlaneActive";
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

const CHAOS_SCENARIO_TO_LEVEL: Record<string, number> = {
  INTERNAL: 1,
  HOME_SERVER: 2,
  CLOUD_EXFIL: 3,
  REMOTE_SUPPORT: 4,
  CASCADING_FAILURE: 5,
};

/** Irontech Chaos JSON on `ingestionDetails` (string or Json) — optional `chaos_level` / `system_impact`. */
function parseChaosMetadataFromIngestion(
  ingestionDetails: string | Prisma.JsonValue | null | undefined,
): { chaosLevel: number | null; systemImpact: string | null } {
  let chaosLevel: number | null = null;
  let systemImpact: string | null = null;
  try {
    const raw =
      ingestionDetails == null
        ? null
        : typeof ingestionDetails === "object" && !Array.isArray(ingestionDetails)
          ? ingestionDetails
          : JSON.parse(String(ingestionDetails));
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { chaosLevel: null, systemImpact: null };
    }
    const j = raw as Record<string, unknown>;
    if (typeof j.chaos_level === "number" && Number.isFinite(j.chaos_level)) {
      chaosLevel = Math.min(5, Math.max(1, Math.round(j.chaos_level)));
    }
    if (typeof j.system_impact === "string" && j.system_impact.trim()) {
      systemImpact = j.system_impact.trim();
    }
    if (chaosLevel == null && typeof j.chaosScenario === "string") {
      const key = j.chaosScenario.trim().toUpperCase();
      chaosLevel = CHAOS_SCENARIO_TO_LEVEL[key] ?? null;
    }
  } catch {
    /* non-JSON or partial payload */
  }
  return { chaosLevel, systemImpact };
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
  governanceHash: true,
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

/** Chaos drills stamp `ingestionDetails` with `isChaosTest` / optional `entityType: CHAOS_DRILL` (see `chaosActions`). */
function chaosIdentifiedThreatEventClause(): Prisma.ThreatEventWhereInput {
  return {
    AND: [
      { status: ThreatState.IDENTIFIED },
      {
        OR: [
          { ingestionDetails: { contains: '"isChaosTest":true', mode: "insensitive" } },
          { ingestionDetails: { contains: '"isChaosTest": true', mode: "insensitive" } },
          { ingestionDetails: { contains: '"incident_type":"CHAOS"', mode: "insensitive" } },
          { ingestionDetails: { contains: '"incident_type": "CHAOS"', mode: "insensitive" } },
          { ingestionDetails: { contains: '"category":"INFRASTRUCTURE"', mode: "insensitive" } },
          { ingestionDetails: { contains: '"category": "INFRASTRUCTURE"', mode: "insensitive" } },
          { ingestionDetails: { contains: "Infrastructure Drift", mode: "insensitive" } },
          { ingestionDetails: { contains: "CHAOS_DRILL", mode: "insensitive" } },
          { ingestionDetails: { contains: "IRONCHAOS", mode: "insensitive" } },
        ],
      },
    ],
  };
}

/**
 * Active board: acknowledged/mitigation work. In shadow read scope (env `SHADOW_PLANE_ACTIVE` and/or simulation cookie),
 * also return in-flight Chaos drills (`IDENTIFIED` + chaos / infrastructure drift markers) so `/api/threats/active` stays aligned with Irontech remediation.
 */
function getThreatEventWhereForActiveBoard(shadowReadScope: boolean): Prisma.ThreatEventWhereInput {
  const base = getActiveThreatWhereClause();
  if (!shadowReadScope) return base;
  return { OR: [base, chaosIdentifiedThreatEventClause()] };
}

function getRiskEventWhereForActiveBoard(shadowReadScope: boolean): Prisma.RiskEventWhereInput {
  const base: Prisma.RiskEventWhereInput = {
    status: { in: [ThreatState.CONFIRMED, ThreatState.MITIGATED] },
  };
  if (!shadowReadScope) return base;
  return {
    OR: [
      base,
      {
        AND: [
          { status: ThreatState.IDENTIFIED },
          {
            OR: [
              { ingestionDetails: { path: ["isChaosTest"], equals: true } },
              { ingestionDetails: { path: ["entityType"], equals: "CHAOS_DRILL" } },
              { ingestionDetails: { path: ["incident_type"], equals: "CHAOS" } },
              { ingestionDetails: { path: ["category"], equals: "INFRASTRUCTURE" } },
            ],
          },
        ],
      },
    ],
  };
}

export async function findActiveThreatEventRowsForBoard(): Promise<ActiveBoardUnionRow[]> {
  /** Must match `ingressGateway.writeThreatEvent` — shadow env + sim cookie still reads `ThreatEvent` for active board. */
  const useRiskEventTable = await ingressUsesRiskEventTable();
  const shadowReadScope =
    isShadowPlaneActiveFromEnv() || (await readSimulationPlaneEnabled());
  const tenantUuid = await getActiveTenantUuidFromCookies();
  if (useRiskEventTable) {
    return prisma.riskEvent.findMany({
      where: {
        AND: [{ tenantId: tenantUuid }, getRiskEventWhereForActiveBoard(shadowReadScope)],
      },
      select: simActiveThreatBoardSelect,
      orderBy: { updatedAt: "desc" },
    });
  }
  const companies = await prisma.company.findMany({
    where: { tenantId: tenantUuid },
    select: { id: true },
  });
  const companyIds = companies.map((c) => c.id);
  if (companyIds.length === 0) return [];
  return prisma.threatEvent.findMany({
    where: {
      AND: [{ tenantCompanyId: { in: companyIds } }, getThreatEventWhereForActiveBoard(shadowReadScope)],
    },
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
    const chaosMeta = parseChaosMetadataFromIngestion(r.ingestionDetails);
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
      governanceHash:
        "governanceHash" in r
          ? ((r as { governanceHash?: string | null }).governanceHash ?? null)
          : null,
      chaosLevel: chaosMeta.chaosLevel,
      systemImpact: chaosMeta.systemImpact,
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
  /** Shadow plane: `computeSimThreatTenantBindingHash` hex (ingest seal). */
  governanceHash?: string | null;
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
  /** Irontech Chaos drill level (1–5) from `ingestionDetails` JSON when present. */
  chaosLevel?: number | null;
  /** Optional infrastructure / resilience impact line from chaos JSON. */
  systemImpact?: string | null;
};

/** Includes only active workflow states (no pipeline/history flooding). */
export async function queryActiveThreatsForBoard(): Promise<PipelineThreatFromDb[]> {
  const rows = await findActiveThreatEventRowsForBoard();
  return mapThreatEventRowsToPipelineThreatFromDb(rows);
}
