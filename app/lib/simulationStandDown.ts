import prisma from "@/lib/prisma";
import { SIMULATION_CONFIG_ID } from "@/app/utils/simulationConfigConstants";

type StandDownMap = Record<string, string>;

function parseStandDownMap(raw: unknown): StandDownMap {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as StandDownMap;
}

/** True when purge stand-down is active for this tenant (blocks chaos / bot re-inject). */
export async function isSimulationStandDownActiveForTenant(tenantId: string): Promise<boolean> {
  const tid = tenantId.trim();
  if (!tid) return false;
  const row = await prisma.simulationConfig.findUnique({
    where: { id: SIMULATION_CONFIG_ID },
    select: { simulationStandDownExpiresAtByTenant: true },
  });
  const map = parseStandDownMap(row?.simulationStandDownExpiresAtByTenant);
  const iso = map[tid];
  if (typeof iso !== "string" || !iso.trim()) return false;
  const exp = Date.parse(iso.trim());
  return Number.isFinite(exp) && exp > Date.now();
}

export async function assertSimulationInjectAllowedForTenant(tenantId: string): Promise<void> {
  if (await isSimulationStandDownActiveForTenant(tenantId)) {
    throw new Error(
      "SIMULATION_STAND_DOWN: Board purge stand-down is active; automated threat inject is paused for this tenant.",
    );
  }
}

/**
 * Removes this tenant from the purge stand-down map so manual bot / chaos inject can proceed.
 * Automated paths that only call `assertSimulationInjectAllowedForTenant` remain blocked until the next purge.
 */
export async function clearSimulationStandDown(tenantId: string): Promise<void> {
  const tid = tenantId.trim();
  if (!tid) return;

  await prisma.$transaction(async (tx) => {
    const cfg = await tx.simulationConfig.findUnique({
      where: { id: SIMULATION_CONFIG_ID },
      select: { simulationStandDownExpiresAtByTenant: true },
    });
    if (!cfg) return;
    const prev = parseStandDownMap(cfg.simulationStandDownExpiresAtByTenant);
    if (!(tid in prev)) return;
    const next: StandDownMap = { ...prev };
    delete next[tid];
    await tx.simulationConfig.update({
      where: { id: SIMULATION_CONFIG_ID },
      data: { simulationStandDownExpiresAtByTenant: next as object },
    });
  });
}
