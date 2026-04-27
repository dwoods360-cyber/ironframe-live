import "server-only";

import { ThreatState } from "@prisma/client";
import prisma from "@/lib/prisma";
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
    tenantCompanyId: company.id,
    sourceAgent: "INFILBOT_SIMULATION" as const,
    status: { not: ThreatState.RESOLVED },
  };
  const wherePhish = {
    tenantCompanyId: company.id,
    sourceAgent: "PHISHBOT_SIMULATION" as const,
    status: { not: ThreatState.RESOLVED },
  };

  const [iProd, iSim, pProd, pSim] = await Promise.all([
    prisma.threatEvent.count({ where: whereInfil }),
    prisma.simThreatEvent.count({ where: whereInfil }),
    prisma.threatEvent.count({ where: wherePhish }),
    prisma.simThreatEvent.count({ where: wherePhish }),
  ]);

  return {
    infiltrBotSimActive: iProd + iSim > 0,
    phishBotSimActive: pProd + pSim > 0,
  };
}
