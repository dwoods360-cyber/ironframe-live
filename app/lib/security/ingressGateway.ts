import { cookies } from "next/headers";
import type { Prisma, ThreatState } from "@prisma/client";
import prisma from "@/lib/prisma";
import { SIMULATION_SOURCE_AGENTS } from "@/app/config/simulationAgents";
import {
  resolveGovernanceMultiplierBpsForTenantUuid,
  TENANT_UUID_REGEX,
} from "@/app/utils/tenantGovernanceBps";
import { computeSimThreatTenantBindingHash } from "@/lib/crypto";
import { updateThreatWithIntegrity } from "@/src/services/threatStateService";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { tenantIndustryCodeToProfileLabel } from "@/app/utils/tenantIndustryProfile";
import { isShadowPlaneActiveFromEnv } from "@/app/utils/shadowPlaneActive";

/** Must match client `SIMULATION_MODE_COOKIE` / `syncSimulationModeCookie` values (`1` / `0`). */
export const INGRESS_SIMULATION_COOKIE = "ironframe-simulation-mode";

/** Server / API / Prisma reads: shadow plane when cookie value is `1`. */
export async function readSimulationPlaneEnabled(): Promise<boolean> {
  const store = await cookies();
  const raw = store.get(INGRESS_SIMULATION_COOKIE)?.value?.trim();
  return raw === "1";
}

/**
 * SimThreatEvent (`RiskEvent`) vs `ThreatEvent`: dashboard strips read `ThreatEvent` whenever
 * `SHADOW_PLANE_ACTIVE` is set (`getDashboardPayloadForTenant`), so ingress must write the same table.
 */
export async function ingressUsesRiskEventTable(): Promise<boolean> {
  const simCookie = await readSimulationPlaneEnabled();
  return simCookie && !isShadowPlaneActiveFromEnv();
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

const BLOCKED_GHOST_TENANT_ID = "9e8d7c6b-5a4f-4321-9e8d-7c6b5a4f3210";

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
      const p = parsed as Record<string, unknown>;
      const merged: Record<string, unknown> = { ...p, ...simulationTag };
      /** Irontech Chaos / Levels 1–5: GRC auditor lane — keep `INFRASTRUCTURE` + `CHAOS` visible for remediation logic (do not leave only generic SIMULATION). */
      const chaosPlane =
        p.isChaosTest === true ||
        p.incident_type === "CHAOS" ||
        (typeof p.entityType === "string" && String(p.entityType).toUpperCase().includes("CHAOS"));
      if (chaosPlane) {
        merged.category = "INFRASTRUCTURE";
        merged.incident_type = "CHAOS";
        merged.shadowSimulationStatus =
          typeof p.shadowSimulationStatus === "string" && p.shadowSimulationStatus.trim()
            ? p.shadowSimulationStatus.trim()
            : "simulated";
        merged.sourcePlane = "SHADOW";
      }
      return JSON.stringify(merged);
    }
  } catch {
    // Preserve original text while still adding mandatory simulation tagging metadata.
  }

  return JSON.stringify({
    raw: details,
    ...simulationTag,
  });
}

/** Same boundary as `getCompanyIdForActiveTenant` — inlined to avoid circular import with `clearanceThreatResolve` → this module. */
async function resolveCanonicalCompanyIdForSessionTenant(): Promise<bigint | null> {
  const tenantUuid = await getActiveTenantUuidFromCookies();
  const primary = await prisma.company.findFirst({
    where: { tenantId: tenantUuid, isTestRecord: false },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  if (primary) return primary.id;
  const fallback = await prisma.company.findFirst({
    where: { tenantId: tenantUuid },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  return fallback?.id ?? null;
}

async function writeThreatEvent(payload: IngressPayload): Promise<IngressBotThreatCreated> {
  const useRiskEventTable = await ingressUsesRiskEventTable();
  const payloadWithCategory: IngressPayload = {
    ...payload,
    ingestionDetails: attachSimulationCategoryToIngestionDetails(
      typeof payload.ingestionDetails === "string" ? payload.ingestionDetails : undefined,
      typeof payload.sourceAgent === "string" ? payload.sourceAgent : undefined,
      useRiskEventTable,
    ),
  };
  if (useRiskEventTable) {
    /** Irongate (Agent 14): stamp shadow writes from the active dashboard session — cookie + canonical company for that tenant (Dev Switcher / ironframe-tenant). */
    const cookieTenantUuid = (await getActiveTenantUuidFromCookies()).trim();
    if (!cookieTenantUuid || !TENANT_UUID_REGEX.test(cookieTenantUuid)) {
      throw new Error(
        "Ingress: SimThreatEvent requires a valid active tenant session (set ironframe-tenant cookie / Dev Tenant Switcher).",
      );
    }
    const canonicalCompanyId = await resolveCanonicalCompanyIdForSessionTenant();
    if (canonicalCompanyId == null) {
      throw new Error(
        "Ingress: SimThreatEvent requires tenantCompanyId for the active tenant (no Company row for session tenant).",
      );
    }
    const companyRow = await prisma.company.findUnique({
      where: { id: canonicalCompanyId },
      select: { tenantId: true },
    });
    const tenantId = cookieTenantUuid;
    if (!companyRow?.tenantId || companyRow.tenantId.trim() !== tenantId) {
      throw new Error(
        "Ingress: active company ↔ session tenant alignment failed (Irongate stamp rejected).",
      );
    }
    payloadWithCategory.tenantCompanyId = canonicalCompanyId;
    if (tenantId === BLOCKED_GHOST_TENANT_ID) {
      throw new Error("BLOCK: Hardcoded Sandbox ID detected in Production Write.");
    }
    const tenantRow = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { industry: true },
    });
    const tenantIndustryProfile = tenantIndustryCodeToProfileLabel(tenantRow?.industry);
    const targetEntity = String((payloadWithCategory as { targetEntity?: unknown }).targetEntity ?? "");
    if (
      targetEntity.toLowerCase().includes("defense") &&
      tenantIndustryProfile !== "Defense"
    ) {
      throw new Error(
        `Ingress: Defense context assertion failed (tenant industry ${tenantIndustryProfile}, targetEntity ${targetEntity}).`,
      );
    }
    /** Same bps as server `getTenantGovernanceMultiplierBps` / `resolveGovernanceMultiplierBpsForTenantUuid` — seal uses row multiplier post-insert. */
    const gov = await resolveGovernanceMultiplierBpsForTenantUuid(tenantId);
    if (!gov.ok) {
      throw new Error(`Ingress: governance multiplier — ${gov.error}`);
    }
    const governanceImpactMultiplier = BigInt(gov.bps);
    const row = await prisma.riskEvent.create({
      data: {
        ...(payloadWithCategory as Prisma.RiskEventUncheckedCreateInput),
        tenantId,
        governanceImpactMultiplier,
      },
      select: {
        ...BOT_THREAT_WRITE_SELECT,
        governanceImpactMultiplier: true,
      },
    });
    console.log(
      "SUCCESS: Row written to DB for Tenant:",
      tenantId,
      "with ID:",
      row.id,
    );
    const multBps = row.governanceImpactMultiplier ?? 100n;
    const tenantBindingSeal = computeSimThreatTenantBindingHash({
      tenantId,
      riskEventId: row.id,
      governanceImpactMultiplierBps: multBps,
    });
    await prisma.riskEvent.updateMany({
      where: { tenantId, id: row.id },
      data: { governanceHash: tenantBindingSeal },
    });
    return {
      id: row.id,
      title: row.title,
      sourceAgent: row.sourceAgent,
      score: row.score,
      targetEntity: row.targetEntity,
      financialRisk_cents: row.financialRisk_cents,
      status: row.status,
    };
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
  const useRiskEventTable = await ingressUsesRiskEventTable();
  const updateWithCategory: Prisma.ThreatEventUncheckedUpdateInput = {
    ...data,
    ingestionDetails: attachSimulationCategoryToIngestionDetails(
      typeof data.ingestionDetails === "string" ? data.ingestionDetails : undefined,
      typeof data.sourceAgent === "string" ? data.sourceAgent : undefined,
      useRiskEventTable,
    ),
  };
  if (useRiskEventTable) {
    const scope = await prisma.riskEvent.findFirst({
      where: { id },
      select: { tenantId: true },
    });
    if (!scope?.tenantId) {
      throw new Error(`Ingress: SimThreatEvent missing tenant scope for update (id=${id}).`);
    }
    await prisma.riskEvent.updateMany({
      where: { id, tenantId: scope.tenantId },
      data: updateWithCategory as Prisma.RiskEventUncheckedUpdateInput,
    });
    const row = await prisma.riskEvent.findFirst({
      where: { id, tenantId: scope.tenantId },
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
  const useRiskEventTable = await ingressUsesRiskEventTable();
  if (useRiskEventTable) {
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

/** Ironguard / Ironlock quarantine surface (Agent 13 & 6) — re-exported for ingress-adjacent imports. */
export {
  evaluateQuarantineLedger,
  bumpLedgerFromIronguardMetadata,
  escalateQuarantineSecondStrikersAfterSystemFreeze,
} from "./quarantineLedgerGuard";
