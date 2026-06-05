import { ThreatState } from "@prisma/client";
import type { ChaosScenario } from "@/app/actions/chaosActions";
import { getCompanyIdForTenantUuid } from "@/app/lib/grc/clearanceThreatResolve";
import { validateIngressContext } from "@/app/middleware/irongateShield";
import prisma from "@/lib/prisma";

/** Numeric scenario ids from the Ironframe Chaos Engine HITL matrix → runtime `ChaosScenario`. */
const SCENARIO_ID_TO_CHAOS: Record<number, ChaosScenario> = {
  0: "INTERNAL",
  1: "HOME_SERVER",
  2: "CLOUD_EXFIL",
  3: "REMOTE_SUPPORT",
  4: "REMOTE_SUPPORT",
  5: "CASCADING_FAILURE",
  6: "INTERNAL",
  7: "INFIL_CRED_STUFFING",
  8: "INFIL_LATERAL_PIVOT",
  9: "PHISH_CEO_FRAUD",
  10: "PHISH_IT_HELPDESK",
  11: "INTERNAL",
  12: "HOME_SERVER",
  13: "CLOUD_EXFIL",
  14: "REMOTE_SUPPORT",
  15: "CASCADING_FAILURE",
  16: "INFIL_CRED_STUFFING",
  17: "PHISH_CEO_FRAUD",
  18: "PHISH_IT_HELPDESK",
};

/** Human-in-the-loop drills that must echo the caller's session tenant (19 scenarios; id 6 excluded). */
export const HITL_DRILL_SCENARIO_IDS = [
  0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
] as const;

export type ChaosDrillPayload = {
  scenarioId: number;
  requestedBy: string;
  sessionTenantId: string | undefined;
};

export type ChaosDrillExecutionResult = {
  id: string;
  /** Active session tenant UUID — router boundary field for zero-bleed assertions. */
  tenantCompanyId: string;
  scenarioId: number;
  status: string;
};

function resolveScenarioFromId(scenarioId: number): ChaosScenario {
  return SCENARIO_ID_TO_CHAOS[scenarioId] ?? "INTERNAL";
}

/**
 * Simulation-plane chaos drill executor — binds every threat card to `sessionTenantId`
 * before persisting via Prisma (tenant scope stamped in `ingestionDetails.tenantScopeUuid`).
 */
export async function executeChaosDrill(
  payload: ChaosDrillPayload,
): Promise<ChaosDrillExecutionResult> {
  const { tenantId: tenantScopeUuid } = validateIngressContext(payload.sessionTenantId);
  const scenario = resolveScenarioFromId(payload.scenarioId);

  let companyId = await getCompanyIdForTenantUuid(tenantScopeUuid);
  if (companyId == null) {
    await prisma.tenant.upsert({
      where: { id: tenantScopeUuid },
      create: {
        id: tenantScopeUuid,
        name: "Ironchaos Bootstrap Tenant",
        slug: `chaos-${tenantScopeUuid.slice(0, 8)}`,
        industry: "Secure Enclave",
      },
      update: {},
    });
    const company = await prisma.company.create({
      data: {
        name: "Chaos Lab Co",
        sector: "Technology",
        tenantId: tenantScopeUuid,
        isTestRecord: true,
      },
      select: { id: true },
    });
    companyId = company.id;
  }

  const ingestionDetails = JSON.stringify({
    isChaosTest: true,
    tenantScopeUuid,
    chaosTenantCompanyId: companyId.toString(),
    chaosScenario: scenario,
    scenarioId: payload.scenarioId,
    requestedBy: payload.requestedBy,
  });

  const created = await prisma.threatEvent.create({
    data: {
      title: `Ironframe Chaos Drill — Scenario ${payload.scenarioId}`,
      sourceAgent: "CHAOS_SIMULATION",
      score: 10,
      targetEntity: "ChaosLab",
      financialRisk_cents: 0n,
      status: ThreatState.IDENTIFIED,
      tenantCompanyId: companyId,
      ingestionDetails,
      ttlSeconds: 259_200,
    },
  });

  return {
    id: created.id,
    tenantCompanyId: tenantScopeUuid,
    scenarioId: payload.scenarioId,
    status: "ACTIVE",
  };
}
