import "server-only";

import type { Prisma } from "@prisma/client";
import { ThreatState } from "@prisma/client";
import { withIronguardTenant } from "@/app/lib/server/ironguardSessionTenant";
import { isControlStressTestIngestion } from "@/app/utils/controlStressTestIngestion";
import {
  simActiveThreatBoardSelect,
  type SimActiveThreatEventRow,
} from "@/app/utils/activeThreatsBoardQuery";

const TERMINAL: ThreatState[] = [ThreatState.RESOLVED, ThreatState.CLOSED_ARCHIVED];

function isControlStressRiskRow(row: {
  ingestionDetails: Prisma.JsonValue | null;
  title: string;
  targetEntity: string | null;
  sourceAgent: string;
}): boolean {
  if (isControlStressTestIngestion(row.ingestionDetails)) return true;
  if (row.sourceAgent.trim().toUpperCase() !== "HUMAN_SENTINEL") return false;
  const title = row.title.trim();
  const target = row.targetEntity?.trim() ?? "";
  return title.includes("Control Stress Test") || target.includes("Control Stress Test");
}

type RiskEventReader = {
  riskEvent: {
    findMany: (
      args: {
        where: Prisma.RiskEventWhereInput;
        select: Prisma.RiskEventSelect;
        orderBy: Prisma.RiskEventOrderByWithRelationInput;
      },
    ) => Promise<unknown[]>;
  };
};

async function queryControlStressRiskEvents<T>(
  tenantUuid: string,
  statuses: ThreatState[],
  select: Prisma.RiskEventSelect,
  db: RiskEventReader | undefined,
): Promise<T[]> {
  const tid = tenantUuid.trim();
  if (!tid || statuses.length === 0) return [];

  const where = {
    tenantId: tid,
    status: { in: statuses.filter((s) => !TERMINAL.includes(s)) },
  };

  const rows = db
    ? await db.riskEvent.findMany({
        where,
        select,
        orderBy: { updatedAt: "desc" },
      })
    : await withIronguardTenant(tid, (tx) =>
        tx.riskEvent.findMany({
          where,
          select,
          orderBy: { updatedAt: "desc" },
        }),
      );

  return (rows as T[]).filter((row) => isControlStressRiskRow(row as never));
}

export async function listControlStressRiskEventsForTenant(
  tenantUuid: string,
  statuses: ThreatState[],
  db?: RiskEventReader,
): Promise<SimActiveThreatEventRow[]> {
  return queryControlStressRiskEvents<SimActiveThreatEventRow>(
    tenantUuid,
    statuses,
    simActiveThreatBoardSelect,
    db,
  );
}

export function mergeBoardRowsById<A extends { id: string }, B extends { id: string }>(
  primary: readonly A[],
  bridge: readonly B[],
): Array<A | B> {
  const seen = new Set(primary.map((r) => r.id));
  const out: Array<A | B> = [...primary];
  for (const row of bridge) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

/** Pipeline fetch shape when production reads `ThreatEvent` but stress tests live on `RiskEvent`. */
export const pipelineControlStressBridgeSelect = {
  id: true,
  title: true,
  financialRisk_cents: true,
  score: true,
  targetEntity: true,
  sourceAgent: true,
  createdAt: true,
  assigneeId: true,
  status: true,
  ingestionDetails: true,
  dispositionStatus: true,
  isFalsePositive: true,
  receiptHash: true,
} satisfies Prisma.RiskEventSelect;

export type PipelineControlStressBridgeRow = Prisma.RiskEventGetPayload<{
  select: typeof pipelineControlStressBridgeSelect;
}>;

export async function listControlStressRiskEventsForPipeline(
  tenantUuid: string,
  statuses: ThreatState[],
  db?: RiskEventReader,
): Promise<PipelineControlStressBridgeRow[]> {
  return queryControlStressRiskEvents<PipelineControlStressBridgeRow>(
    tenantUuid,
    statuses,
    pipelineControlStressBridgeSelect,
    db,
  );
}
