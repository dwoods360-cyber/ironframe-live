import "server-only";

import { ThreatState } from "@prisma/client";
import prisma from "@/lib/prisma";
import { withIronguardTenant } from "@/app/lib/server/ironguardSessionTenant";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

export type ShadowSimulatorArmSnapshot = {
  infiltrBotSimActive: boolean;
  phishBotSimActive: boolean;
};

/**
 * Reads whether InfilBot / PhishBot have in-flight simulated threats for the active tenant company
 * (production + sim planes). Matches `clearShadowSimulatorPipeline` semantics (`status` not `RESOLVED`).
 */
export async function readShadowSimulatorArmSnapshot(): Promise<ShadowSimulatorArmSnapshot> {
  const tenantId = await getActiveTenantUuidFromCookies();
  const company = await prisma.company.findFirst({
    where: { tenantId },
    select: { id: true },
  });
  if (!company) {
    return { infiltrBotSimActive: false, phishBotSimActive: false };
  }

  const whereInfil = {
    tenantId,
    tenantCompanyId: company.id,
    sourceAgent: "INFILBOT_SIMULATION" as const,
    status: { not: ThreatState.RESOLVED },
  };
  const wherePhish = {
    tenantId,
    tenantCompanyId: company.id,
    sourceAgent: "PHISHBOT_SIMULATION" as const,
    status: { not: ThreatState.RESOLVED },
  };

  const [iProd, iSim, pProd, pSim] = await withIronguardTenant(tenantId, (tx) =>
    Promise.all([
      tx.threatEvent.count({ where: whereInfil }),
      tx.riskEvent.count({ where: whereInfil }),
      tx.threatEvent.count({ where: wherePhish }),
      tx.riskEvent.count({ where: wherePhish }),
    ]),
  );

  return {
    infiltrBotSimActive: iProd + iSim > 0,
    phishBotSimActive: pProd + pSim > 0,
  };
}
