"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import prisma from "@/lib/prisma";
import { prismaAdmin } from "@/lib/prismaAdmin";
import { ThreatState } from "@prisma/client";
import { SIMULATION_SIGNATURES } from "@/app/config/constants";
import {
  getActiveTenantUuidFromCookies,
  isValidTenantUuid,
} from "@/app/utils/serverTenantContext";
import {
  queryActiveThreatsForBoard,
  type PipelineThreatFromDb as PipelineThreatFromDbImported,
} from "@/app/utils/activeThreatsBoardQuery";

const DEFAULT_TTL_SECONDS = 259200; // 72 hours

async function resolveCompanyForSimulation(tenantUuid: string): Promise<{ id: bigint } | null> {
  // 1. Attempt strict lookup by provided tenant UUID
  let company = await prismaAdmin.company.findFirst({
    where: { tenantId: tenantUuid },
    select: { id: true, isTestRecord: true },
  });

  // 2. Fallback to authorized Sandbox
  if (!company) {
    company = await prismaAdmin.company.findFirst({
      where: { isTestRecord: true },
      select: { id: true, isTestRecord: true },
    });
  }

  // 3. Absolute fallback: Grab first available record
  if (!company) {
    company = await prismaAdmin.company.findFirst({
      select: { id: true, isTestRecord: true },
    });
  }

  // 4. GRC-safe bootstrap: if DB has no company rows, create a minimal test tenant+company.
  if (!company) {
    const tenant = await prismaAdmin.tenant.upsert({
      where: { id: tenantUuid },
      update: {},
      create: {
        id: tenantUuid,
        name: `Simulation Tenant ${tenantUuid.slice(0, 8).toUpperCase()}`,
        slug: `sim-${tenantUuid.toLowerCase()}`,
        industry: "Secure Enclave",
      },
      select: { id: true },
    });

    company = await prismaAdmin.company.create({
      data: {
        name: "Simulation Company (Auto-Bootstrap)",
        sector: "General",
        isTestRecord: true,
        tenantId: tenant.id,
      },
      select: { id: true, isTestRecord: true },
    });
  }

  return company ? { id: company.id } : null;
}

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
  const sourceAgent = "KIMBOT";
  const tenantUuid = await getActiveTenantUuidFromCookies();
  if (!isValidTenantUuid(tenantUuid)) {
    throw new Error("Invalid active tenant context.");
  }
  const company = await resolveCompanyForSimulation(tenantUuid);
  if (!company) {
    throw new Error("Database Empty: Please run npx prisma db seed");
  }
  const created = await prismaAdmin.threatEvent.create({
    data: {
      title: input.title,
      sourceAgent,
      score,
      targetEntity: input.sector,
      financialRisk_cents: millionsToCents(input.liability),
      status: ThreatState.PIPELINE,
      ttlSeconds: DEFAULT_TTL_SECONDS,
      tenantCompanyId: company.id,
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
  try {
    const simulatedDelegate = (prismaAdmin as unknown as {
      simulatedThreatEvent?: { create: (arg: unknown) => Promise<unknown> };
    }).simulatedThreatEvent;
    if (simulatedDelegate?.create) {
      await simulatedDelegate.create({
        data: {
          title: input.title,
          sourceAgent,
          score,
          targetEntity: input.sector,
          financialRisk_cents: millionsToCents(input.liability),
          status: ThreatState.PIPELINE,
          ttlSeconds: DEFAULT_TTL_SECONDS,
          drillId: `kimbot-${Date.now()}`,
          tenantCompanyId: company.id,
        },
      });
    }
  } catch (error) {
    console.error("KIMBOT simulated shadow write failed (non-blocking):", error);
  }
  return {
    ...created,
    state: created.status,
    financialRisk_cents: Number(created.financialRisk_cents),
  } as GrcBotThreatCreated;
}

const CENTS_PER_MILLION = 100_000_000;
/** Floor for zero-liability sim inputs to preserve forensic financial baselines. */
const MIN_SIMULATION_FLOOR_CENTS = 150_000_00n;

function millionsToCents(valueM: number): bigint {
  if (!Number.isFinite(valueM) || valueM <= 0) {
    return MIN_SIMULATION_FLOOR_CENTS;
  }
  const computed = BigInt(Math.round(valueM * CENTS_PER_MILLION));
  return computed > 0n ? computed : MIN_SIMULATION_FLOOR_CENTS;
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
  if (!isValidTenantUuid(tenantUuid)) {
    throw new Error("Invalid active tenant context.");
  }
  const company = await resolveCompanyForSimulation(tenantUuid);
  if (!company) {
    throw new Error("Database Empty: Please run npx prisma db seed");
  }
  const created = await prismaAdmin.threatEvent.create({
    data: {
      title: input.title,
      sourceAgent: input.source,
      score,
      targetEntity: input.sector,
      financialRisk_cents: millionsToCents(input.liability),
      status: ThreatState.PIPELINE,
      ttlSeconds: DEFAULT_TTL_SECONDS,
      tenantCompanyId: company.id,
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
  try {
    const simulatedDelegate = (prismaAdmin as unknown as {
      simulatedThreatEvent?: { create: (arg: unknown) => Promise<unknown> };
    }).simulatedThreatEvent;
    if (simulatedDelegate?.create) {
      await simulatedDelegate.create({
        data: {
          title: input.title,
          sourceAgent: input.source,
          score,
          targetEntity: input.sector,
          financialRisk_cents: millionsToCents(input.liability),
          status: ThreatState.PIPELINE,
          ttlSeconds: DEFAULT_TTL_SECONDS,
          drillId: `grcbot-${Date.now()}`,
          tenantCompanyId: company.id,
        },
      });
    }
  } catch (error) {
    console.error("GRCBOT simulated shadow write failed (non-blocking):", error);
  }
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

/**
 * Scoped control-room purge: clears ThreatEvent cards and BotAuditLog stream only.
 * Company/Tenant entities are intentionally untouched.
 */
export async function purgeControlRoomState(): Promise<{ ok: true }> {
  const tenantUuid = await getActiveTenantUuidFromCookies();
  const isTenantScoped = isValidTenantUuid(tenantUuid);
  const tenantCompanyIds = isTenantScoped
    ? (
        await prismaAdmin.company.findMany({
          where: { tenantId: tenantUuid },
          select: { id: true },
        })
      ).map((c) => c.id)
    : [];
  const simulationSourceFilters = SIMULATION_SIGNATURES.flatMap((sig) => [
    { sourceAgent: { contains: sig, mode: "insensitive" as const } },
    { title: { contains: sig, mode: "insensitive" as const } },
  ]);

  const simulationThreats = await prismaAdmin.threatEvent.findMany({
    where: {
      ...(tenantCompanyIds.length > 0 ? { tenantCompanyId: { in: tenantCompanyIds } } : {}),
      OR: simulationSourceFilters,
    },
    select: { id: true },
  });
  const simulationThreatIds = simulationThreats.map((t) => t.id);

  if (simulationThreatIds.length > 0) {
    await prismaAdmin.workNote.deleteMany({
      where: { threatId: { in: simulationThreatIds } },
    });
  }

  await prismaAdmin.auditLog.deleteMany({
    where: {
      OR: [
        { isSimulation: true },
        ...(simulationThreatIds.length > 0 ? [{ threatId: { in: simulationThreatIds } }] : []),
      ],
    },
  });

  await prismaAdmin.botAuditLog.deleteMany({
    where: {
      OR: [
        { botType: { in: ["ATTBOT", "KIMBOT", "GRCBOT", "IRONTECH", "IRONWATCH"] } },
        ...(simulationThreatIds.length > 0 ? [{ threatId: { in: simulationThreatIds } }] : []),
      ],
    },
  });

  await prismaAdmin.activeRisk.deleteMany({
    where: {
      ...(tenantCompanyIds.length > 0 ? { company_id: { in: tenantCompanyIds } } : {}),
      OR: [
        { isSimulation: true },
        ...SIMULATION_SIGNATURES.map((sig) => ({
          source: { contains: sig, mode: "insensitive" as const },
        })),
      ],
    },
  });

  if (simulationThreatIds.length > 0) {
    await prismaAdmin.threatEvent.deleteMany({
      where: { id: { in: simulationThreatIds } },
    });
  }

  if (isTenantScoped) {
    // Reset simulation-only LangGraph checkpoints so unified_risks cannot rehydrate ghost simulation cards.
    await prisma.agentGraphState.deleteMany({
      where: {
        tenantId: tenantUuid,
        OR: [
          {
            state: {
              path: ["checkpoint", "channel_values", "data_path"],
              equals: "SIMULATION",
            },
          },
          {
            state: {
              path: ["checkpoint", "channel_values", "ledger_blocked"],
              equals: true,
            },
          },
        ],
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  return { ok: true };
}
