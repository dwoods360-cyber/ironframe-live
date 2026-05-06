import { cookies } from "next/headers";
import type { Prisma, ThreatState } from "@prisma/client";
import prisma from "@/lib/prisma";
import { SIMULATION_SOURCE_AGENTS } from "@/app/config/simulationAgents";
import { updateThreatWithIntegrity } from "@/src/services/threatStateService";

/** Must match client `SIMULATION_MODE_COOKIE` / `syncSimulationModeCookie` values (`1` / `0`). */
export const INGRESS_SIMULATION_COOKIE = "ironframe-simulation-mode";

/** Server / API / Prisma reads: shadow plane when cookie value is `1`. */
export async function readSimulationPlaneEnabled(): Promise<boolean> {
  const store = await cookies();
  const raw = store.get(INGRESS_SIMULATION_COOKIE)?.value?.trim();
  return raw === "1";
}

/** Unchecked create payload shared by `ThreatEvent` and `SimThreatEvent` (same scalar layout). */
export type IngressPayload = Prisma.ThreatEventUncheckedCreateInput;

const BOT_THREAT_WRITE_SELECT = {
  id: true,
  title: true,
  sourceAgent: true,
  score: true,
  targetEntity: true,
  financialRisk_cents: true,
  status: true,
} as const satisfies Prisma.ThreatEventSelect;

export type IngressBotThreatCreated = {
  id: string;
  title: string;
  sourceAgent: string;
  score: number;
  targetEntity: string;
  financialRisk_cents: bigint;
  status: ThreatState;
};

const ATT_FETCH_SELECT = {
  id: true,
  title: true,
  sourceAgent: true,
  score: true,
  targetEntity: true,
  financialRisk_cents: true,
  createdAt: true,
} as const satisfies Prisma.ThreatEventSelect;

export type IngressAttbotThreatRow = {
  id: string;
  title: string;
  sourceAgent: string;
  score: number;
  targetEntity: string;
  financialRisk_cents: bigint;
  createdAt: Date;
};

function attachSimulationCategoryToIngestionDetails(
  details: string | null | undefined,
  sourceAgent: string | null | undefined,
  forceSimulation: boolean,
): string {
  const shouldTag =
    forceSimulation || (typeof sourceAgent === "string" && SIMULATION_SOURCE_AGENTS.has(sourceAgent));
  if (!shouldTag) return details ?? "";

  const simulationTag = {
    category: "SIMULATION",
    sourcePlane: "SHADOW",
  } as const;

  if (!details || !details.trim()) {
    return JSON.stringify(simulationTag);
  }

  try {
    const parsed = JSON.parse(details) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return JSON.stringify({ ...(parsed as Record<string, unknown>), ...simulationTag });
    }
  } catch {
    // Preserve original text while still adding mandatory simulation tagging metadata.
  }

  return JSON.stringify({
    raw: details,
    ...simulationTag,
  });
}

async function writeThreatEvent(payload: IngressPayload): Promise<IngressBotThreatCreated> {
  const isSim = await readSimulationPlaneEnabled();
  const payloadWithCategory: IngressPayload = {
    ...payload,
    ingestionDetails: attachSimulationCategoryToIngestionDetails(
      typeof payload.ingestionDetails === "string" ? payload.ingestionDetails : undefined,
      typeof payload.sourceAgent === "string" ? payload.sourceAgent : undefined,
      isSim,
    ),
  };
  if (isSim) {
    if (payloadWithCategory.tenantCompanyId == null) {
      throw new Error(
        "Ingress: SimThreatEvent requires tenantCompanyId (shadow plane must match production isolation).",
      );
    }
    let tenantId: string | undefined =
      (payloadWithCategory as { tenantId?: string | null }).tenantId ?? undefined;
    if (tenantId == null) {
      const c = await prisma.company.findUnique({
        where: { id: payloadWithCategory.tenantCompanyId },
        select: { tenantId: true },
      });
      tenantId = c?.tenantId ?? undefined;
    }
    if (tenantId == null) {
      throw new Error("Ingress: SimThreatEvent requires tenantId (shadow plane tenant boundary).");
    }
    const row = await prisma.riskEvent.create({
      data: {
        ...(payloadWithCategory as Prisma.RiskEventUncheckedCreateInput),
        tenantId,
      },
      select: BOT_THREAT_WRITE_SELECT,
    });
    return row;
  }
  return prisma.threatEvent.create({
    data: payloadWithCategory,
    select: BOT_THREAT_WRITE_SELECT,
  });
}

/** Same cookie routing as `writeThreatEvent` (e.g. GRC finalize + Attbot second-phase update). */
async function updateThreatEvent(
  id: string,
  data: Prisma.ThreatEventUncheckedUpdateInput,
): Promise<IngressBotThreatCreated> {
  const isSim = await readSimulationPlaneEnabled();
  const updateWithCategory: Prisma.ThreatEventUncheckedUpdateInput = {
    ...data,
    ingestionDetails: attachSimulationCategoryToIngestionDetails(
      typeof data.ingestionDetails === "string" ? data.ingestionDetails : undefined,
      typeof data.sourceAgent === "string" ? data.sourceAgent : undefined,
      isSim,
    ),
  };
  if (isSim) {
    await prisma.riskEvent.updateMany({
      where: { id },
      data: updateWithCategory as Prisma.RiskEventUncheckedUpdateInput,
    });
    const row = await prisma.riskEvent.findFirst({
      where: { id },
      select: BOT_THREAT_WRITE_SELECT,
    });
    if (!row) throw new Error(`Ingress: SimThreatEvent not found after update (id=${id}).`);
    return row;
  }
  return updateThreatWithIntegrity<IngressBotThreatCreated>({
    threatId: id,
    changes: updateWithCategory as Prisma.ThreatEventUpdateInput,
    actorUserId: "irongate-ingress",
    eventType: "INGRESS_GATEWAY_UPDATE",
    select: BOT_THREAT_WRITE_SELECT,
  });
}

/** Fetch a single bot row by id on the same plane as create/update for this request. */
async function findThreatEventByIdForBots(id: string): Promise<IngressAttbotThreatRow | null> {
  const isSim = await readSimulationPlaneEnabled();
  if (isSim) {
    return prisma.riskEvent.findFirst({
      where: { id },
      select: ATT_FETCH_SELECT,
    });
  }
  return prisma.threatEvent.findUnique({
    where: { id },
    select: ATT_FETCH_SELECT,
  });
}

export const ingressGateway = {
  writeThreatEvent,
  updateThreatEvent,
  findThreatEventByIdForBots,
};
