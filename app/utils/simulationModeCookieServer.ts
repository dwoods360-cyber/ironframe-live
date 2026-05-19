import "server-only";

import { cookies } from "next/headers";
import { SIMULATION_MODE_COOKIE } from "@/app/constants/simulationCookie";

/** Server: `ironframe-simulation-mode=1` (shadow / red-team lane). */
export async function readSimulationModeCookieEnabled(): Promise<boolean> {
  const store = await cookies();
  return store.get(SIMULATION_MODE_COOKIE)?.value?.trim() === "1";
}
