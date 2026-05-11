"use server";

import { unstable_noStore as noStore, revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { ThreatState, type Prisma } from "@prisma/client";
import { ingressGateway, readSimulationPlaneEnabled } from "@/app/lib/security/ingressGateway";
import { getCompanyIdForActiveTenant } from "@/app/lib/grc/clearanceThreatResolve";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { assertSimulationInjectAllowedForTenant } from "@/app/lib/simulationStandDown";
import {
  ATTACK_SOURCE,
  ATTACK_THREAT_TITLE_PREFIX,
  GRC_SOURCE,
  GRC_THREAT_TITLE_PREFIX,
  KIMBOT_SOURCE,
  KIMBOT_THREAT_TITLE_PREFIX,
} from "@/app/config/agents";
import { isShadowPlaneActiveFromEnv } from "@/app/utils/shadowPlaneActive";
import {
  queryActiveThreatsForBoard,
  type PipelineThreatFromDb as PipelineThreatFromDbImported,
} from "@/app/utils/activeThreatsBoardQuery";
import {
  normalizeIngestionDetailsToString,
  parseIngestionDetailsForMerge,
} from "@/app/utils/ingestionDetailsMerge";

const DEFAULT_TTL_SECONDS = 259200; // 72 hours

function parseShadowCisoHandshakeFromIngestion(
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
  const tenantUuid = await getActiveTenantUuidFromCookies();
  if (tenantUuid?.trim()) {
    await assertSimulationInjectAllowedForTenant(tenantUuid.trim());
  }
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
    status: ThreatState.IDENTIFIED,
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
  const tenantUuid = await getActiveTenantUuidFromCookies();
  if (tenantUuid?.trim()) {
    await assertSimulationInjectAllowedForTenant(tenantUuid.trim());
  }
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
    status: ThreatState.IDENTIFIED,
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
    status: ThreatState.IDENTIFIED,
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
  noStore();
  const sim = await readSimulationPlaneEnabled();
  /** Cookie-aligned tenant UUID — SimThreatEvent rows MUST match this or assignee actions fail scope checks. */
  const tenantUuid = await getActiveTenantUuidFromCookies();

  const statusClause = {
    AND: [
      {
        status: {
          notIn: [ThreatState.RESOLVED, ThreatState.CLOSED_ARCHIVED],
        },
      },
      { status: { in: [ThreatState.IDENTIFIED, ThreatState.MITIGATED] } },
    ],
  };
  const pipelineScalarsProd = {
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
  } satisfies Prisma.ThreatEventSelect;
  /** Shadow plane: tenant binding SHA-256 (`computeSimThreatTenantBindingHash`) for Audit Intelligence / forensic strip. */
  const pipelineScalarsSim = {
    ...pipelineScalarsProd,
    governanceHash: true,
  } satisfies Prisma.RiskEventSelect;
  const pipelineProdSelect = {
    ...pipelineScalarsProd,
    resolutionApprovalId: true,
    resolutionApproval: {
      select: { id: true, status: true },
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
  } satisfies Prisma.ThreatEventSelect;

  const rows = sim
    ? await prisma.riskEvent.findMany({
        where: {
          AND: [{ tenantId: tenantUuid }, statusClause],
        },
        orderBy: { createdAt: "desc" },
        select: pipelineScalarsSim,
      })
    : await (async () => {
        const companies = await prisma.company.findMany({
          where: { tenantId: tenantUuid },
          select: { id: true },
        });
        const companyIds = companies.map((c) => c.id);
        if (companyIds.length === 0) return [];
        return prisma.threatEvent.findMany({
          where: {
            AND: [{ tenantCompanyId: { in: companyIds } }, statusClause],
          },
          orderBy: { createdAt: "desc" },
          select: pipelineProdSelect,
        });
      })();

  return rows.map((r) => {
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
    const shadow = sim ? parseShadowCisoHandshakeFromIngestion(r.ingestionDetails) : null;
    const resolutionApprovalId = sim
      ? shadow?.resolutionApprovalId ?? null
      : (r as { resolutionApprovalId?: string | null; resolutionApproval?: { id: string; status: string } | null })
          .resolutionApprovalId ??
        (r as { resolutionApproval?: { id: string; status: string } | null }).resolutionApproval?.id ??
        null;
    const resolutionApprovalStatus = sim
      ? shadow?.resolutionApprovalStatus ?? null
      : (((r as { resolutionApproval?: { status: string } | null }).resolutionApproval?.status ??
          null) as "PENDING" | "APPROVED" | "REJECTED" | null);
    return {
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
      ingestionDetails: normalizeIngestionDetailsToString(r.ingestionDetails) ?? undefined,
      dispositionStatus: r.dispositionStatus ?? undefined,
      isFalsePositive: r.isFalsePositive,
      receiptHash: r.receiptHash ?? undefined,
      governanceHash: sim
        ? ((r as { governanceHash?: string | null }).governanceHash ?? undefined)
        : undefined,
      agentReasonings,
      resolutionApprovalId,
      resolutionApprovalStatus,
    };
  });
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

/**
 * Shadow-plane / simulation lab: inject 15–20 randomized KIM / GRC / Attbot pipeline threats.
 */
export async function fireAdversarialSalvoServerAction(): Promise<
  { ok: true; injected: number } | { ok: false; error: string }
> {
  noStore();
  const planeEnv = isShadowPlaneActiveFromEnv();
  const simPlane = await readSimulationPlaneEnabled();
  if (!planeEnv && !simPlane) {
    return {
      ok: false,
      error: "Enable SHADOW_PLANE_ACTIVE or simulation mode (ironframe-simulation-mode cookie).",
    };
  }
  const tenantUuid = await getActiveTenantUuidFromCookies();
  if (!tenantUuid?.trim()) {
    return { ok: false, error: "No active tenant (ironframe-tenant cookie)." };
  }
  await assertSimulationInjectAllowedForTenant(tenantUuid.trim());

  const sectors = ["Healthcare", "Finance", "Technology", "Defense", "Energy"] as const;
  const total = 15 + Math.floor(Math.random() * 6);
  let injected = 0;
  for (let i = 0; i < total; i++) {
    const roll = Math.floor(Math.random() * 3);
    const sector = sectors[Math.floor(Math.random() * sectors.length)]!;
    const liability = 1.2 + Math.random() * 8;
    const sev = 3 + Math.floor(Math.random() * 7);
    const stamp = Date.now();
    try {
      if (roll === 0) {
        await createKimbotThreatServer({
          title: `${KIMBOT_THREAT_TITLE_PREFIX} Salvo ${i + 1} — ${stamp}`,
          sector,
          liability,
          source: KIMBOT_SOURCE,
          severity: sev,
        });
      } else if (roll === 1) {
        await createGrcBotThreatServer({
          title: `${GRC_THREAT_TITLE_PREFIX} Salvo ${i + 1} — ${stamp}`,
          sector,
          liability,
          source: GRC_SOURCE,
          severity: sev,
        });
      } else {
        await createKimbotThreatServer({
          title: `${ATTACK_THREAT_TITLE_PREFIX} Salvo ${i + 1} — ${stamp}`,
          sector,
          liability,
          source: ATTACK_SOURCE,
          severity: sev,
        });
      }
      injected++;
    } catch (e) {
      console.error("[fireAdversarialSalvoServerAction]", e);
    }
  }
  revalidatePath("/");
  return { ok: true, injected };
}
