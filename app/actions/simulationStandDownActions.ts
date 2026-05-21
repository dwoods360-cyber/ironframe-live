"use server";

import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { clearSimulationStandDown } from "@/app/lib/simulationStandDown";

/** Called from client when the operator intentionally starts KIMBOT/GRCBOT or similar manual simulation. */
export async function clearStandDownForManualSimulationInjectAction(): Promise<{ ok: boolean }> {
  const tenantId = await getActiveTenantUuidFromCookies();
  if (!tenantId?.trim()) return { ok: false };
  await clearSimulationStandDown(tenantId.trim());
  return { ok: true };
}
