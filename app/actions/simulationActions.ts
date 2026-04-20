"use server";

import { unstable_noStore as noStore } from "next/cache";
import prisma from "@/lib/prisma";
import { ThreatState } from "@prisma/client";
import { ingressGateway, readSimulationPlaneEnabled } from "@/app/lib/security/ingressGateway";
import { getCompanyIdForActiveTenant } from "@/app/lib/grc/clearanceThreatResolve";
import { GRC_SOURCE, GRC_THREAT_TITLE_PREFIX } from "@/app/config/agents";
import {
  queryActiveThreatsForBoard,
  type PipelineThreatFromDb as PipelineThreatFromDbImported,
} from "@/app/utils/activeThreatsBoardQuery";

const DEFAULT_TTL_SECONDS = 259200; // 72 hours

export type CreateGrcBotThreatInput = {
  title: string;
  sector: string;
  liability: number;
  source: string;
  severity: number;
};

export type GrcBotThreatCreated = {
  id: string;
  title: string;
  sourceAgent: string;
  score: number;
  targetEntity: string;
  financialRisk_cents: number;
  state: ThreatState;
};

export type CreateKimbotThreatInput = {
  title: string;
  sector: string;
  liability: number;
  source: string;
  severity: number;
};

/**
 * Persist a KIMBOT Red Team threat to the database so Ack/De-Ack and audit succeed.
 * Call this when generating Kimbot signals so pipeline cards reference a real ThreatEvent row.
 */
export async function createKimbotThreatServer(
  input: CreateKimbotThreatInput
): Promise<GrcBotThreatCreated> {
  const score = Math.min(10, Math.max(1, Math.round(input.severity)));
  const companyId = await getCompanyIdForActiveTenant();
  if (companyId == null) {
    throw new Error(
      "GRC: No Company for the active tenant session; cannot create Kimbot threat without tenantCompanyId.",
    );
  }
  const created = await ingressGateway.writeThreatEvent({
    title: input.title,
    sourceAgent: input.source,
    score,
    targetEntity: input.sector,
    financialRisk_cents: millionsToCents(input.liability),
    status: ThreatState.PIPELINE,
    ttlSeconds: DEFAULT_TTL_SECONDS,
    tenantCompanyId: companyId,
  });
  return {
    ...created,
    state: created.status,
    financialRisk_cents: Number(created.financialRisk_cents),
  } as GrcBotThreatCreated;
}

const CENTS_PER_MILLION = 100_000_000;

function millionsToCents(valueM: number): bigint {
  return BigInt(Math.round(valueM * CENTS_PER_MILLION));
}

function centsToMillions(value: bigint | number): number {
  return Number(value) / CENTS_PER_MILLION;
}

/**
 * GRC bot placeholder row (pipeline). Resolve tenant company first, then a single `create`
 * — matches the last known-good ingestion shape (no split create/update for company link).
 */
export async function createGrcBotThreatPlaceholderServer(): Promise<GrcBotThreatCreated> {
  const companyId = await getCompanyIdForActiveTenant();
  if (companyId == null) {
    throw new Error(
      "GRC: No Company for the active tenant session; cannot create bot placeholder without tenantCompanyId.",
    );
  }
  const created = await ingressGateway.writeThreatEvent({
    title: `${GRC_THREAT_TITLE_PREFIX} Initializing…`,
    sourceAgent: GRC_SOURCE,
    score: 1,
    targetEntity: "—",
    financialRisk_cents: 0n,
    status: ThreatState.PIPELINE,
    ttlSeconds: DEFAULT_TTL_SECONDS,
    tenantCompanyId: companyId,
  });
  return {
    ...created,
    state: created.status,
    financialRisk_cents: Number(created.financialRisk_cents),
  } as GrcBotThreatCreated;
}

/** Finalize placeholder row created by `createGrcBotThreatPlaceholderServer` with real simulation fields. */
export async function updateGrcBotThreatServer(
  id: string,
  input: CreateGrcBotThreatInput,
): Promise<GrcBotThreatCreated> {
  const score = Math.min(10, Math.max(1, Math.round(input.severity)));
  const updated = await ingressGateway.updateThreatEvent(id, {
    title: input.title,
    sourceAgent: input.source,
    score,
    targetEntity: input.sector,
    financialRisk_cents: millionsToCents(input.liability),
    status: ThreatState.PIPELINE,
    ttlSeconds: DEFAULT_TTL_SECONDS,
  });
  return {
    ...updated,
    state: updated.status,
    financialRisk_cents: Number(updated.financialRisk_cents),
  } as GrcBotThreatCreated;
}

/**
 * Single-shot GRC create (placeholder + finalize in one flow for legacy callers).
 */
export async function createGrcBotThreatServer(
  input: CreateGrcBotThreatInput,
): Promise<GrcBotThreatCreated> {
  const placeholder = await createGrcBotThreatPlaceholderServer();
  return updateGrcBotThreatServer(placeholder.id, input);
}

export type PipelineThreatFromDb = PipelineThreatFromDbImported;

function threatMetadataToRecord(raw: unknown): Record<string, unknown> | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return undefined;
}

/**
 * Fetch all pipeline-stage threats from the database for the MEDSHIELD THREAT PIPELINE
 * so the UI shows only real, actionable cards.
 */
export async function fetchPipelineThreatsFromDb(): Promise<PipelineThreatFromDb[]> {
  const sim = await readSimulationPlaneEnabled();
  const pipelineQuery = {
    where: { status: { in: [ThreatState.PIPELINE, ThreatState.QUARANTINED] } },
    select: {
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
    },
    orderBy: { createdAt: "desc" as const },
  };
  const rows = sim
    ? await prisma.simThreatEvent.findMany(pipelineQuery)
    : await prisma.threatEvent.findMany(pipelineQuery);
  return rows.map((r) => ({
    id: r.id,
    name: r.title,
    loss: centsToMillions(r.financialRisk_cents),
    score: r.score,
    industry: r.targetEntity,
    source: r.sourceAgent,
    description: `Liability: $${centsToMillions(r.financialRisk_cents).toFixed(1)}M · ${r.sourceAgent}`,
    createdAt: r.createdAt.toISOString(),
    assignedTo: r.assigneeId?.trim() || undefined,
    threatStatus: String(r.status),
    ingestionDetails: r.ingestionDetails ?? undefined,
    dispositionStatus: r.dispositionStatus ?? undefined,
    isFalsePositive: r.isFalsePositive,
    receiptHash: r.receiptHash ?? undefined,
  }));
}

/**
 * Fetch ACTIVE, ESCALATED, and PENDING_REMOTE_INTERVENTION ThreatEvents for the Active board.
 */
export async function fetchActiveThreatsFromDb(
  _cacheBuster?: number,
): Promise<PipelineThreatFromDb[]> {
  void _cacheBuster;
  noStore();
  return queryActiveThreatsForBoard();
}
