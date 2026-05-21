"use server";

import {
  getActiveTenantUuidFromCookies,
  getRedTeamSimulationTenantUuid,
} from "@/app/utils/serverTenantContext";
import { listRiskRegistryForTenant } from "@/app/lib/riskRegistryDb";
import {
  ingestRedTeamAttackToRegistry,
  processRiskLifecycle,
} from "@/app/services/riskLifecycle";
import { riskRegistryToDeckCard } from "@/app/utils/riskRegistryCardMap";
import type { RiskDeckCardItem } from "@/app/types/riskCard";
import type { RiskRegistryRecord } from "@/app/types/riskLifecycle";

export async function ingestRedTeamRiskAction(input: {
  title: string;
  telemetryValue: string;
  sourceAgent: string;
  payload: unknown;
}): Promise<{ ok: boolean; record: RiskRegistryRecord | null }> {
  const tenantId = await getRedTeamSimulationTenantUuid();
  if (!tenantId) {
    return { ok: false, record: null };
  }
  const record = await ingestRedTeamAttackToRegistry({
    tenantId,
    title: input.title,
    telemetryValue: input.telemetryValue,
    sourceAgent: input.sourceAgent,
    payload: input.payload,
  });
  return { ok: Boolean(record), record };
}

export async function processRiskLifecycleAction(
  riskId: string,
  opts?: { riskEventId?: string },
): Promise<Awaited<ReturnType<typeof processRiskLifecycle>>> {
  const tenantId = await getRedTeamSimulationTenantUuid();
  if (!tenantId) {
    return {
      ok: false,
      record: null,
      previousStatus: null,
      nextStatus: null,
      error: "no_tenant",
    };
  }
  return processRiskLifecycle(riskId, tenantId, opts);
}

export async function listRiskRegistryRecordsAction(): Promise<{
  ok: boolean;
  records: RiskRegistryRecord[];
}> {
  const tenantId = await getActiveTenantUuidFromCookies();
  if (!tenantId) return { ok: false, records: [] };
  const records = await listRiskRegistryForTenant(tenantId);
  return { ok: true, records };
}
