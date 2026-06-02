import "server-only";

import { diffTelemetryState, type TelemetryPatch } from "@/src/services/telemetry/stateDiffer";

type TelemetryEmissionResult =
  | { ok: true; patch: TelemetryPatch; initialized: boolean }
  | { ok: false; error: string };

const telemetryStateByTenant = new Map<string, unknown>();

export function resetTelemetryPatchStreamCache(): void {
  telemetryStateByTenant.clear();
}

export function getTelemetryPatchStreamSnapshot(tenantId: string): unknown | null {
  const key = tenantId.trim();
  if (!key) return null;
  return telemetryStateByTenant.get(key) ?? null;
}

/**
 * Epic 17 Option A.1 — per-tenant telemetry stream interceptor.
 * Computes compact deterministic patches and stores latest state snapshot.
 */
export function emitTelemetryPatchForTenant(tenantId: string, nextState: unknown): TelemetryEmissionResult {
  const key = tenantId.trim();
  if (!key) return { ok: false, error: "EPIC_17_INVALID_TENANT_CONTEXT" };

  const previousState = telemetryStateByTenant.get(key) ?? {};
  const initialized = !telemetryStateByTenant.has(key);
  try {
    const patch = diffTelemetryState(previousState, nextState, key);
    telemetryStateByTenant.set(key, nextState);
    return { ok: true, patch, initialized };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}
