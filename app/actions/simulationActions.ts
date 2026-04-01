"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import prisma from "@/lib/prisma";
import { ThreatState } from "@prisma/client";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
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
  const tenantUuid = await getActiveTenantUuidFromCookies();
  const company = await prisma.company.findFirst({
    where: { tenantId: tenantUuid },
    select: { id: true },
  });
  const created = await prisma.threatEvent.create({
    data: {
      title: input.title,
      sourceAgent: input.source,
      score,
      targetEntity: input.sector,
      financialRisk_cents: millionsToCents(input.liability),
      status: ThreatState.PIPELINE,
      ttlSeconds: DEFAULT_TTL_SECONDS,
      tenantCompanyId: company?.id,
    },
    select: {
      id: true,
      title: true,
      sourceAgent: true,
      score: true,
      targetEntity: true,
      financialRisk_cents: true,
      status: true,
    },
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
 * Persist a GRCBOT-simulated threat to the database before the UI shows the card.
 * The bot (grcBotEngine) awaits this server action and only then calls addThreatToPipeline,
 * so every card the user sees is backed by a ThreatEvent row and triage/audit succeed.
 */
export async function createGrcBotThreatServer(
  input: CreateGrcBotThreatInput
): Promise<GrcBotThreatCreated> {
  const score = Math.min(10, Math.max(1, Math.round(input.severity)));
  const tenantUuid = await getActiveTenantUuidFromCookies();
  const company = await prisma.company.findFirst({
    where: { tenantId: tenantUuid },
    select: { id: true },
  });
  const created = await prisma.threatEvent.create({
    data: {
      title: input.title,
      sourceAgent: input.source,
      score,
      targetEntity: input.sector,
      financialRisk_cents: millionsToCents(input.liability),
      status: ThreatState.PIPELINE,
      ttlSeconds: DEFAULT_TTL_SECONDS,
      tenantCompanyId: company?.id,
    },
    select: {
      id: true,
      title: true,
      sourceAgent: true,
      score: true,
      targetEntity: true,
      financialRisk_cents: true,
      status: true,
    },
  });
  return {
    ...created,
    state: created.status,
    financialRisk_cents: Number(created.financialRisk_cents),
  } as GrcBotThreatCreated;
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
  const rows = await prisma.threatEvent.findMany({
    where: { status: ThreatState.PIPELINE },
    select: {
      id: true,
      title: true,
      financialRisk_cents: true,
      score: true,
      targetEntity: true,
      sourceAgent: true,
      createdAt: true,
      assigneeId: true,
    },
    orderBy: { createdAt: "desc" },
  });
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
  revalidatePath("/dashboard");
  revalidatePath("/");
  return queryActiveThreatsForBoard();
}
