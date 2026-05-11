/** Same value as `SIMULATION_MODE_COOKIE` in `systemConfigStore` — avoid importing a `"use client"` module from shared utils. */
const SIMULATION_MODE_COOKIE = "ironframe-simulation-mode";

/** Client: shadow / simulation plane active (persistent adversarial drills). */
export function isShadowPlaneActiveClient(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((row) => row.startsWith(`${SIMULATION_MODE_COOKIE}=1`));
}

/**
 * Client UI “live range”: simulation cookie and/or `NEXT_PUBLIC_SHADOW_PLANE_ACTIVE` (browser mirror of `SHADOW_PLANE_ACTIVE`).
 * Combine with `useSystemConfigStore().isSimulationMode` when the Command Center toggle must count too.
 */
export function isShadowPlaneUiActive(): boolean {
  if (typeof window !== "undefined") {
    const pub = process.env.NEXT_PUBLIC_SHADOW_PLANE_ACTIVE;
    if (pub === "true" || pub === "1") return true;
  }
  return isShadowPlaneActiveClient();
}

/** Server / route: env kill-switch OR simulation cookie (same as `readSimulationPlaneEnabled` cookie half). */
export function isShadowPlaneActiveFromEnv(): boolean {
  return process.env.SHADOW_PLANE_ACTIVE === "true" || process.env.SHADOW_PLANE_ACTIVE === "1";
}
