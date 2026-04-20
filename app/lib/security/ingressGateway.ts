import { cookies } from "next/headers";
import type { Prisma, ThreatState } from "@prisma/client";
import prisma from "@/lib/prisma";

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

async function writeThreatEvent(payload: IngressPayload): Promise<IngressBotThreatCreated> {
  const isSim = await readSimulationPlaneEnabled();
  if (isSim) {
    if (payload.tenantCompanyId == null) {
      throw new Error(
        "Ingress: SimThreatEvent requires tenantCompanyId (shadow plane must match production isolation).",
      );
    }
    const row = await prisma.simThreatEvent.create({
      data: payload as Prisma.SimThreatEventUncheckedCreateInput,
      select: BOT_THREAT_WRITE_SELECT,
    });
    return row;
  }
  return prisma.threatEvent.create({
    data: payload,
    select: BOT_THREAT_WRITE_SELECT,
  });
}

/** Same cookie routing as `writeThreatEvent` (e.g. GRC finalize + Attbot second-phase update). */
async function updateThreatEvent(
  id: string,
  data: Prisma.ThreatEventUncheckedUpdateInput,
): Promise<IngressBotThreatCreated> {
  const isSim = await readSimulationPlaneEnabled();
  if (isSim) {
    const row = await prisma.simThreatEvent.update({
      where: { id },
      data: data as Prisma.SimThreatEventUncheckedUpdateInput,
      select: BOT_THREAT_WRITE_SELECT,
    });
    return row;
  }
  return prisma.threatEvent.update({
    where: { id },
    data,
    select: BOT_THREAT_WRITE_SELECT,
  });
}

/** Fetch a single bot row by id on the same plane as create/update for this request. */
async function findThreatEventByIdForBots(id: string): Promise<IngressAttbotThreatRow | null> {
  const isSim = await readSimulationPlaneEnabled();
  if (isSim) {
    return prisma.simThreatEvent.findUnique({
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
