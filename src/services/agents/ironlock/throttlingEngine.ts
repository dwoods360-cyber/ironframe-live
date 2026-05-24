import "server-only";

import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import prisma from "@/lib/prisma";
import {
  readCarbonPulseState,
  writeCarbonPulseState,
  type IronlockThrottleTenantRecord,
} from "@/app/lib/ironbloom/carbonPulseState";
import { getTenantCarbonIntensityThresholdGco2 } from "@/app/config/tenantCarbonZones";
import { tenantKeyFromUuid, type TenantKey } from "@/app/utils/tenantIsolation";
import type { DirtyGridMonitorResult } from "./dirtyGridMonitor";

/** Real-time operator message when autonomous mitigation delays background agents. */
export const IRONLOCK_AUTO_THROTTLE_NOTIFICATION =
  "IRONLOCK: Auto-Throttling engaged. Background agents suppressed to mitigate Sustainability ALE risk.";

const THROTTLE_AUDIT_COOLDOWN_MS = 45 * 60 * 1000;

function randomGovernanceDelayMs(): number {
  return 5000 + Math.floor(Math.random() * 5001);
}

export type IronlockThrottleEvaluation = {
  dirtyWindow: boolean;
  intensityGco2PerKwh: number;
  thresholdGco2PerKwh: number;
  autonomousMitigationEnabled: boolean;
  throttleActive: boolean;
  notificationMessage: string | null;
  record: IronlockThrottleTenantRecord;
};

async function readAutonomousMitigationEnabled(): Promise<boolean> {
  const row = await prisma.systemConfig.findUnique({
    where: { id: "global" },
    select: { autonomousCarbonMitigation: true },
  });
  return row?.autonomousCarbonMitigation === true;
}

/**
 * Persist Agent 6 throttle state after a fresh grid intensity reading (e.g. dirty-grid monitor).
 * Dirty window: live intensity strictly exceeds tenant carbon threshold (gCO₂eq/kWh).
 */
export async function reconcileIronlockThrottleFromMonitor(
  tenantId: string,
  monitor: Pick<DirtyGridMonitorResult, "currentIntensityGco2PerKwh" | "zone"> & {
    tenantKey?: TenantKey | null;
  },
): Promise<IronlockThrottleEvaluation> {
  const state = await readCarbonPulseState();
  const tenantKey = monitor.tenantKey ?? tenantKeyFromUuid(tenantId) ?? "medshield";
  const thresholdGco2PerKwh = getTenantCarbonIntensityThresholdGco2(tenantKey);
  const intensityGco2PerKwh = monitor.currentIntensityGco2PerKwh;
  const dirtyWindow = intensityGco2PerKwh > thresholdGco2PerKwh;
  const autonomousMitigationEnabled = await readAutonomousMitigationEnabled();
  const throttleActive = dirtyWindow && autonomousMitigationEnabled;

  const prevRecord = state.ironlockThrottleByTenant?.[tenantId];
  const prevActive = prevRecord?.active === true;
  let lastAutoThrottleAuditAt = prevRecord?.lastAutoThrottleAuditAt;

  let notificationMessage: string | null = null;

  if (throttleActive && !prevActive) {
    const lastAt = lastAutoThrottleAuditAt ? Date.parse(lastAutoThrottleAuditAt) : 0;
    const cooled = lastAt && Date.now() - lastAt < THROTTLE_AUDIT_COOLDOWN_MS;
    if (!cooled) {
      notificationMessage = IRONLOCK_AUTO_THROTTLE_NOTIFICATION;
      lastAutoThrottleAuditAt = new Date().toISOString();
      try {
        await auditLogCreateLoose({
          data: {
            action: "CARBON_MITIGATION_EVENT",
            justification: JSON.stringify({
              agent: "IRONLOCK_AGENT_6",
              event: "AUTO_THROTTLE_ENGAGED",
              message: IRONLOCK_AUTO_THROTTLE_NOTIFICATION,
              zone: monitor.zone,
              intensityGco2PerKwh,
              thresholdGco2PerKwh,
            }),
            operatorId: "IRONLOCK_AGENT_6",
            threatId: null,
            isSimulation: false,
            tenant_id: tenantId,
          },
        });
      } catch {
        /* best-effort */
      }
    }
  }

  const record: IronlockThrottleTenantRecord = {
    active: throttleActive,
    updatedAt: new Date().toISOString(),
    intensityGco2PerKwh,
    thresholdGco2PerKwh,
    autonomousMitigationEnabled,
    lastAutoThrottleAuditAt,
  };

  await writeCarbonPulseState({
    ...state,
    ironlockThrottleByTenant: {
      ...state.ironlockThrottleByTenant,
      [tenantId]: record,
    },
  });

  return {
    dirtyWindow,
    intensityGco2PerKwh,
    thresholdGco2PerKwh,
    autonomousMitigationEnabled,
    throttleActive,
    notificationMessage,
    record,
  };
}

export type IronlockThrottlePayload = {
  agent6SuppressingBackground: boolean;
  dirtyWindowForThrottle: boolean;
  autonomousMitigationEnabled: boolean;
  intensityGco2PerKwh: number;
  thresholdGco2PerKwh: number;
  lastUpdatedAt: string | null;
  notificationMessage: string | null;
};

export function getIronlockThrottlePayloadSync(tenantId: string): IronlockThrottlePayload {
  throw new Error(
    "getIronlockThrottlePayloadSync() requires Postgres; use getIronlockThrottlePayload() instead.",
  );
}

export async function getIronlockThrottlePayload(tenantId: string): Promise<IronlockThrottlePayload> {
  const rec = await prisma.ironlockCarbonThrottle.findUnique({ where: { tenantId } });
  const dirtyWindowForThrottle = rec
    ? rec.intensityGco2PerKwh > rec.thresholdGco2PerKwh
    : false;
  return {
    agent6SuppressingBackground: rec?.active === true,
    dirtyWindowForThrottle,
    autonomousMitigationEnabled: rec?.autonomousMitigationEnabled === true,
    intensityGco2PerKwh: rec?.intensityGco2PerKwh ?? 0,
    thresholdGco2PerKwh: rec?.thresholdGco2PerKwh ?? 0,
    lastUpdatedAt: rec?.updatedAt.toISOString() ?? null,
    notificationMessage: rec?.active ? IRONLOCK_AUTO_THROTTLE_NOTIFICATION : null,
  };
}

/** LangGraph governance_delay for non-critical background agents (ms). */
export async function getIronlockGovernanceDelayMsForTenant(tenantId: string): Promise<number> {
  if (!tenantId?.trim() || tenantId === "00000000-0000-0000-0000-000000000000") return 0;
  const rec = await prisma.ironlockCarbonThrottle.findUnique({
    where: { tenantId },
    select: { active: true },
  });
  if (!rec?.active) return 0;
  return randomGovernanceDelayMs();
}

/** @deprecated Use {@link getIronlockGovernanceDelayMsForTenant}. */
export function getIronlockGovernanceDelayMsForTenantSync(tenantId: string): number {
  throw new Error(
    "getIronlockGovernanceDelayMsForTenantSync() requires Postgres; use getIronlockGovernanceDelayMsForTenant() instead.",
  );
}
