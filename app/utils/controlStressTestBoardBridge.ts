import "server-only";

import type { Prisma } from "@prisma/client";
import { ThreatState } from "@prisma/client";
import prisma from "@/lib/prisma";
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

export async function listControlStressRiskEventsForTenant(
  tenantUuid: string,
  statuses: ThreatState[],
): Promise<SimActiveThreatEventRow[]> {
  const tid = tenantUuid.trim();
  if (!tid || statuses.length === 0) return [];

  const rows = await prisma.riskEvent.findMany({
    where: {
      tenantId: tid,
      status: { in: statuses.filter((s) => !TERMINAL.includes(s)) },
    },
    select: simActiveThreatBoardSelect,
    orderBy: { updatedAt: "desc" },
  });

  return rows.filter((row) => isControlStressRiskRow(row));
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
): Promise<PipelineControlStressBridgeRow[]> {
  const tid = tenantUuid.trim();
  if (!tid || statuses.length === 0) return [];

  const rows = await prisma.riskEvent.findMany({
    where: {
      tenantId: tid,
      status: { in: statuses.filter((s) => !TERMINAL.includes(s)) },
    },
    select: pipelineControlStressBridgeSelect,
    orderBy: { updatedAt: "desc" },
  });

  return rows.filter((row) => isControlStressRiskRow(row));
}
