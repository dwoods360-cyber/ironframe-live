import "server-only";

import {
  findRiskRegistryById,
  insertRiskRegistryIngested,
  updateRiskRegistry,
} from "@/app/lib/riskRegistryDb";
import { sanitizeAttackPayload } from "@/app/services/governanceScoring";
import type { RiskLifecycleStatus, RiskRegistryRecord } from "@/app/types/riskLifecycle";
import { deltaLabelForLifecycle } from "@/app/utils/riskRegistryCardMap";

export type ProcessRiskLifecycleResult = {
  ok: boolean;
  record: RiskRegistryRecord | null;
  previousStatus: RiskLifecycleStatus | null;
  nextStatus: RiskLifecycleStatus | null;
  sanitizedPayload?: string;
  error?: string;
};

function parseIngestionObject(sanitized: string): Record<string, unknown> | null {
  if (sanitized === "NO_PAYLOAD_DETECTED") return null;
  try {
    const parsed = JSON.parse(sanitized) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return { rawPayload: sanitized };
  }
  return { rawPayload: sanitized };
}

export { riskRegistryToDeckCard } from "@/app/utils/riskRegistryCardMap";

/**
 * Advance one lifecycle stage. REGISTERED runs sanitizeAttackPayload + JSON coercion.
 */
export async function processRiskLifecycle(
  riskId: string,
  tenantId: string,
  opts?: { riskEventId?: string },
): Promise<ProcessRiskLifecycleResult> {
  const current = await findRiskRegistryById(riskId, tenantId);
  if (!current) {
    return {
      ok: false,
      record: null,
      previousStatus: null,
      nextStatus: null,
      error: "risk_not_found",
    };
  }

  const previousStatus = current.lifecycleStatus;
  let nextStatus: RiskLifecycleStatus = previousStatus;
  let patch: Parameters<typeof updateRiskRegistry>[2] = {};

  switch (previousStatus) {
    case "INGESTED": {
      nextStatus = "REGISTERED";
      const sanitized = sanitizeAttackPayload(current.ingestionDetails);
      const parsed = parseIngestionObject(sanitized);
      patch = {
        lifecycleStatus: nextStatus,
        deltaLabel: deltaLabelForLifecycle(nextStatus),
        ingestionDetails: parsed ?? { sanitizedPayload: sanitized },
      };
      break;
    }
    case "REGISTERED": {
      nextStatus = "ACTIVE";
      patch = {
        lifecycleStatus: nextStatus,
        deltaLabel: deltaLabelForLifecycle(nextStatus),
        ...(opts?.riskEventId ? { riskEventId: opts.riskEventId } : {}),
      };
      break;
    }
    case "ACTIVE": {
      nextStatus = "RESOLVED";
      patch = {
        lifecycleStatus: nextStatus,
        deltaLabel: deltaLabelForLifecycle(nextStatus),
      };
      break;
    }
    case "RESOLVED":
      return {
        ok: true,
        record: current,
        previousStatus,
        nextStatus: previousStatus,
      };
  }

  const updated = await updateRiskRegistry(riskId, tenantId, patch);
  return {
    ok: Boolean(updated),
    record: updated,
    previousStatus,
    nextStatus,
    sanitizedPayload:
      previousStatus === "INGESTED" ? sanitizeAttackPayload(current.ingestionDetails) : undefined,
    error: updated ? undefined : "update_failed",
  };
}

export async function ingestRedTeamAttackToRegistry(input: {
  tenantId: string;
  title: string;
  telemetryValue: string;
  sourceAgent: string;
  payload: unknown;
}): Promise<RiskRegistryRecord | null> {
  return insertRiskRegistryIngested({
    tenantId: input.tenantId,
    title: input.title,
    telemetryValue: input.telemetryValue,
    sourceAgent: input.sourceAgent,
    ingestionDetails: input.payload,
    deltaLabel: deltaLabelForLifecycle("INGESTED"),
  });
}
