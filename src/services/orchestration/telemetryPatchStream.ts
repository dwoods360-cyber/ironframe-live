import "server-only";

import { diffTelemetryState, type TelemetryPatch } from "@/src/services/telemetry/stateDiffer";

type TelemetryEmissionResult =
  | { ok: true; patch: TelemetryPatch; initialized: boolean }
  | { ok: false; error: string };

const telemetryStateByTenant = new Map<string, unknown>();

/** Runtime observability signature written by the sovereign bus ironcast node. */
export const EPIC17_TELEMETRY_STREAM_SIGNATURE = "[epic17-telemetry-stream]" as const;

export type Epic17TelemetryStreamObservability =
  | {
      signature: typeof EPIC17_TELEMETRY_STREAM_SIGNATURE;
      tenantId: string;
      ok: true;
      initialized: boolean;
      added: string[];
      updated: string[];
      removed: string[];
      unchangedCount: number;
    }
  | {
      signature: typeof EPIC17_TELEMETRY_STREAM_SIGNATURE;
      tenantId: string;
      ok: false;
      error: string;
    };

const epic17ObservabilityByTenant = new Map<string, Epic17TelemetryStreamObservability>();

export function resetTelemetryPatchStreamCache(): void {
  telemetryStateByTenant.clear();
  epic17ObservabilityByTenant.clear();
}

/** Mirrors the ironcast `console.info` payload for shadow-smoke / API echo (one-shot per tenant). */
export function recordEpic17TelemetryStreamObservability(
  tenantId: string,
  emission: TelemetryEmissionResult,
): void {
  const key = tenantId.trim();
  if (!key) return;

  if (emission.ok) {
    epic17ObservabilityByTenant.set(key, {
      signature: EPIC17_TELEMETRY_STREAM_SIGNATURE,
      tenantId: key,
      ok: true,
      initialized: emission.initialized,
      added: Object.keys(emission.patch.added),
      updated: Object.keys(emission.patch.updated),
      removed: emission.patch.removed,
      unchangedCount: emission.patch.unchangedCount,
    });
    return;
  }

  epic17ObservabilityByTenant.set(key, {
    signature: EPIC17_TELEMETRY_STREAM_SIGNATURE,
    tenantId: key,
    ok: false,
    error: emission.error,
  });
}

export function takeEpic17TelemetryStreamObservability(
  tenantId: string,
): Epic17TelemetryStreamObservability | null {
  const key = tenantId.trim();
  if (!key) return null;
  const record = epic17ObservabilityByTenant.get(key) ?? null;
  epic17ObservabilityByTenant.delete(key);
  return record;
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
