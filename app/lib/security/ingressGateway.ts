import { cookies } from "next/headers";
import type { Prisma, ThreatState } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getPrismaPrivileged } from "@/lib/prismaPrivileged";
import { SIMULATION_SOURCE_AGENTS } from "@/app/config/simulationAgents";
import { withIronguardTenant } from "@/app/lib/server/ironguardSessionTenant";
import {
  resolveGovernanceMultiplierBpsForTenantUuid,
  TENANT_UUID_REGEX,
} from "@/app/utils/tenantGovernanceBps";
import { computeSimThreatTenantBindingHash } from "@/lib/crypto";
import { updateThreatWithIntegrity } from "@/src/services/threatStateService";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { tenantIndustryCodeToProfileLabel } from "@/app/utils/tenantIndustryProfile";
import { isShadowPlaneActiveFromEnv } from "@/app/utils/shadowPlaneActive";
import {
  sanitizeThreatIngressPayload,
  sanitizeThreatIngressUpdate,
} from "@/app/lib/ironethic/sanitizeThreatIngressPayload";
import {
  buildWorkforceAgentIngressPayload,
  mergeAgentIngressIntoIngestionJson,
  parseAgentIngressFromIngestion,
} from "@/app/utils/agentIngressJustification";

/** Cross-tenant id → tenant discovery for updates/fetches before the GUC can be bound. */
async function lookupIngressThreatTenantId(
  id: string,
  useRiskEventTable: boolean,
): Promise<string> {
  const readers: Array<{
    riskEvent: { findFirst: typeof prisma.riskEvent.findFirst };
    threatEvent: { findFirst: typeof prisma.threatEvent.findFirst };
  }> = [];
  try {
    readers.push(getPrismaPrivileged());
  } catch {
    /* PRIVILEGED_DATABASE_URL may be unset while still on BYPASSRLS. */
  }
  readers.push(prisma);

  for (const client of readers) {
    const row = useRiskEventTable
      ? await client.riskEvent.findFirst({ where: { id }, select: { tenantId: true } })
      : await client.threatEvent.findFirst({ where: { id }, select: { tenantId: true } });
    const tenantId = row?.tenantId?.trim() ?? "";
    if (tenantId && TENANT_UUID_REGEX.test(tenantId)) return tenantId;
  }
  throw new Error(`Ingress: threat tenant scope not found (id=${id}).`);
}

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
export type IngressPayload = Omit<Prisma.ThreatEventUncheckedCreateInput, "tenantId"> & {
  /** Resolved and verified by the gateway when callers only know tenantCompanyId. */
  tenantId?: string;
};

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
        merged.sourcePlane = "CHAOS";
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

/** Default agent ingress + playbook options when callers omit them (workforce / DMZ paths). */
function stampWorkforceAgentIngressIfMissing(
  ingestionDetails: string,
  sourceAgent: string | null | undefined,
  title: string | null | undefined,
): string {
  const existing = parseAgentIngressFromIngestion(ingestionDetails);
  if (
    existing &&
    (existing.ingressJustification.trim().length > 0 ||
      existing.suggestedRemediationOptions.length > 0)
  ) {
    return stampAgentDiscoveryProvenance(ingestionDetails);
  }
  return stampAgentDiscoveryProvenance(
    mergeAgentIngressIntoIngestionJson(
      ingestionDetails,
      buildWorkforceAgentIngressPayload(
        typeof sourceAgent === "string" ? sourceAgent : "IRONWAVE",
        typeof title === "string" && title.trim() ? title.trim() : "Threat ingress",
      ),
    ),
  );
}

/** Stamp agent-discovery provenance when workforce ingress playbooks are applied at the gateway. */
function stampAgentDiscoveryProvenance(ingestionDetails: string, threadId?: string): string {
  try {
    const parsed = JSON.parse(ingestionDetails) as Record<string, unknown>;
    if (
      parsed.sourcePlane === "MANUAL" ||
      parsed.sourcePlane === "CHAOS" ||
      parsed.isChaosTest === true
    ) {
      return ingestionDetails;
    }
    const tid =
      (typeof threadId === "string" && threadId.trim()) ||
      (typeof parsed.threadId === "string" && parsed.threadId.trim()) ||
      "";
    return JSON.stringify({
      ...parsed,
      sourcePlane: "AGENT_DISCOVERY",
      ingestionProvenance: "WORKFORCE_AGENT_INGRESS",
      ...(tid ? { threadId: tid, orchestrationThreadId: tid } : {}),
    });
  } catch {
    return ingestionDetails;
  }
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
  const sanitizedPayload = sanitizeThreatIngressPayload(
    payload as Prisma.ThreatEventUncheckedCreateInput,
  );
  const payloadWithCategory: IngressPayload = {
    ...sanitizedPayload,
    ingestionDetails: stampWorkforceAgentIngressIfMissing(
      attachSimulationCategoryToIngestionDetails(
        typeof sanitizedPayload.ingestionDetails === "string"
          ? sanitizedPayload.ingestionDetails
          : undefined,
        typeof sanitizedPayload.sourceAgent === "string" ? sanitizedPayload.sourceAgent : undefined,
        useRiskEventTable,
      ),
      typeof sanitizedPayload.sourceAgent === "string" ? sanitizedPayload.sourceAgent : undefined,
      typeof sanitizedPayload.title === "string" ? sanitizedPayload.title : undefined,
    ),
  };
  if (useRiskEventTable) {
    /** Irongate (Agent 14): bind shadow writes to the company row on the payload when present (Chaos L4 inject passes session tenant company id); else cookie + canonical company. */
    const cookieTenantUuid = (await getActiveTenantUuidFromCookies()).trim();
    const payloadCompanyRaw = (payloadWithCategory as { tenantCompanyId?: unknown }).tenantCompanyId;
    const payloadCompanyId =
      payloadCompanyRaw == null
        ? null
        : typeof payloadCompanyRaw === "bigint"
          ? payloadCompanyRaw
          : BigInt(String(payloadCompanyRaw));

    let tenantId = cookieTenantUuid;
    let canonicalCompanyId: bigint | null = null;

    if (payloadCompanyId != null) {
      const companyRow = await prisma.company.findUnique({
        where: { id: payloadCompanyId },
        select: { tenantId: true },
      });
      if (!companyRow?.tenantId?.trim()) {
        throw new Error("Ingress: tenantCompanyId on payload is not bound to a tenant.");
      }
      tenantId = companyRow.tenantId.trim();
      canonicalCompanyId = payloadCompanyId;
      if (
        cookieTenantUuid &&
        cookieTenantUuid !== tenantId &&
        !isShadowPlaneActiveFromEnv() &&
        !(await readSimulationPlaneEnabled())
      ) {
        throw new Error(
          "Ingress: tenantCompanyId tenant does not match active session tenant (Irongate stamp rejected).",
        );
      }
    } else {
      if (!cookieTenantUuid || !TENANT_UUID_REGEX.test(cookieTenantUuid)) {
        throw new Error(
          "Ingress: SimThreatEvent requires a valid active tenant session (set ironframe-tenant cookie / Dev Tenant Switcher).",
        );
      }
      canonicalCompanyId = await resolveCanonicalCompanyIdForSessionTenant();
      tenantId = cookieTenantUuid;
    }

    if (!tenantId || !TENANT_UUID_REGEX.test(tenantId)) {
      throw new Error(
        "Ingress: SimThreatEvent requires a valid active tenant session (set ironframe-tenant cookie / Dev Tenant Switcher).",
      );
    }
    if (canonicalCompanyId == null) {
      throw new Error(
        "Ingress: SimThreatEvent requires tenantCompanyId for the active tenant (no Company row for session tenant).",
      );
    }
    const companyRow = await prisma.company.findUnique({
      where: { id: canonicalCompanyId },
      select: { tenantId: true },
    });
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
    return withIronguardTenant(tenantId, async (tx) => {
      const row = await tx.riskEvent.create({
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
      await tx.riskEvent.updateMany({
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
    });
  }
  const cookieTenantUuid = (await getActiveTenantUuidFromCookies()).trim();
  const payloadCompanyRaw = payloadWithCategory.tenantCompanyId;
  const payloadCompanyId =
    payloadCompanyRaw == null
      ? null
      : typeof payloadCompanyRaw === "bigint"
        ? payloadCompanyRaw
        : BigInt(String(payloadCompanyRaw));
  const companyTenant = payloadCompanyId == null
    ? null
    : await prisma.company.findUnique({
        where: { id: payloadCompanyId },
        select: { tenantId: true },
      });
  const explicitTenantId = payloadWithCategory.tenantId?.trim();
  const tenantId = explicitTenantId || companyTenant?.tenantId?.trim() || cookieTenantUuid;

  if (!tenantId || !TENANT_UUID_REGEX.test(tenantId)) {
    throw new Error("Ingress: ThreatEvent requires a valid tenant UUID.");
  }
  if (payloadCompanyId != null && !companyTenant) {
    throw new Error("Ingress: tenantCompanyId on payload is not bound to a tenant.");
  }
  if (companyTenant?.tenantId && companyTenant.tenantId !== tenantId) {
    throw new Error("Ingress: tenantCompanyId does not belong to the ThreatEvent tenant.");
  }
  if (cookieTenantUuid && cookieTenantUuid !== tenantId) {
    throw new Error("Ingress: ThreatEvent tenant does not match the active session tenant.");
  }

  return withIronguardTenant(tenantId, (tx) =>
    tx.threatEvent.create({
      data: { ...payloadWithCategory, tenantId },
      select: BOT_THREAT_WRITE_SELECT,
    }),
  );
}

/** Same cookie routing as `writeThreatEvent` (e.g. GRC finalize + Attbot second-phase update). */
async function updateThreatEvent(
  id: string,
  data: Prisma.ThreatEventUncheckedUpdateInput,
): Promise<IngressBotThreatCreated> {
  const useRiskEventTable = await ingressUsesRiskEventTable();
  const sanitizedData = sanitizeThreatIngressUpdate(data);
  const updateWithCategory: Prisma.ThreatEventUncheckedUpdateInput = {
    ...sanitizedData,
    ingestionDetails: attachSimulationCategoryToIngestionDetails(
      typeof sanitizedData.ingestionDetails === "string" ? sanitizedData.ingestionDetails : undefined,
      typeof sanitizedData.sourceAgent === "string" ? sanitizedData.sourceAgent : undefined,
      useRiskEventTable,
    ),
  };
  const tenantId = await lookupIngressThreatTenantId(id, useRiskEventTable);
  return withIronguardTenant(tenantId, async (tx) => {
    if (useRiskEventTable) {
      const scope = await tx.riskEvent.findFirst({
        where: { id, tenantId },
        select: { tenantId: true },
      });
      if (!scope?.tenantId) {
        throw new Error(`Ingress: SimThreatEvent missing tenant scope for update (id=${id}).`);
      }
      await tx.riskEvent.updateMany({
        where: { id, tenantId },
        data: updateWithCategory as Prisma.RiskEventUncheckedUpdateInput,
      });
      const row = await tx.riskEvent.findFirst({
        where: { id, tenantId },
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
      tx,
    });
  });
}

/** Fetch a single bot row by id on the same plane as create/update for this request. */
async function findThreatEventByIdForBots(id: string): Promise<IngressAttbotThreatRow | null> {
  const useRiskEventTable = await ingressUsesRiskEventTable();
  let tenantId: string;
  try {
    tenantId = await lookupIngressThreatTenantId(id, useRiskEventTable);
  } catch {
    return null;
  }
  return withIronguardTenant(tenantId, (tx) =>
    useRiskEventTable
      ? tx.riskEvent.findFirst({
          where: { id, tenantId },
          select: ATT_FETCH_SELECT,
        })
      : tx.threatEvent.findFirst({
          where: { id, tenantId },
          select: ATT_FETCH_SELECT,
        }),
  );
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
