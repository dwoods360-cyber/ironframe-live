import "server-only";

import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { SystemConfigStaleLockdownSlice } from "@/app/config/sustainabilityStaleLockdown";
import { clearGlobalSecurityStateFreeze } from "@/src/services/ironlock/freezeEngine";

/** Legacy / mis-migrated values sometimes land in `emergency_seal` instead of `security_posture`. */
const LEGACY_SEAL_STRINGS = new Set(["DUAL_LOCK", "TRIPARTITE_LOCK"]);

export type ConstitutionalBackendLockReset = {
  stateFreezeCleared: boolean;
  emergencySealSanitized: boolean;
  escalationTimestampsCleared: boolean;
  errors: string[];
};

function isMalformedEmergencySeal(raw: unknown): boolean {
  if (raw == null) return false;
  if (typeof raw === "string") {
    return LEGACY_SEAL_STRINGS.has(raw.trim());
  }
  return false;
}

/**
 * Reads sustainability stale-lockdown fields without failing the integrity sentinel when
 * preview DBs lag migrations (missing `sustainability_*` columns).
 */
export async function readSystemConfigStaleLockdownSliceSafe(): Promise<SystemConfigStaleLockdownSlice | null> {
  try {
    return await prisma.systemConfig.findUnique({
      where: { id: "global" },
      select: {
        sustainabilityLiveApiDegraded: true,
        sustainabilityApiDegradedSince: true,
        sustainabilityStaleLockdownWaived: true,
      },
    });
  } catch (e) {
    console.warn("[systemConfigSafeAccess] sustainability slice unavailable", e);
    return null;
  }
}

export async function readGlobalStateFreezeActiveSafe(): Promise<boolean> {
  try {
    const row = await prisma.systemConfig.findUnique({
      where: { id: "global" },
      select: { stateFreezeActive: true },
    });
    return row?.stateFreezeActive === true;
  } catch (e) {
    console.warn("[systemConfigSafeAccess] stateFreezeActive read failed", e);
    return false;
  }
}

/**
 * Clears Ironlock / Irontech backend latch fields on `SystemConfig` after manual rebaseline.
 * Does not regenerate segmented emergency seals — only removes corrupted `emergency_seal` payloads.
 */
export async function resetConstitutionalBackendLockState(
  operatorId = "SYSTEM_IRONTECH",
): Promise<ConstitutionalBackendLockReset> {
  const result: ConstitutionalBackendLockReset = {
    stateFreezeCleared: false,
    emergencySealSanitized: false,
    escalationTimestampsCleared: false,
    errors: [],
  };

  try {
    await clearGlobalSecurityStateFreeze(operatorId);
    result.stateFreezeCleared = true;
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : String(e));
    try {
      await prisma.systemConfig.update({
        where: { id: "global" },
        data: { stateFreezeActive: false },
      });
      result.stateFreezeCleared = true;
    } catch (inner) {
      result.errors.push(inner instanceof Error ? inner.message : String(inner));
    }
  }

  try {
    const row = await prisma.systemConfig.findUnique({
      where: { id: "global" },
      select: { emergencySeal: true },
    });
    if (row && isMalformedEmergencySeal(row.emergencySeal)) {
      await prisma.systemConfig.update({
        where: { id: "global" },
        data: { emergencySeal: Prisma.DbNull },
      });
      result.emergencySealSanitized = true;
    }
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : String(e));
  }

  try {
    await prisma.systemConfig.update({
      where: { id: "global" },
      data: {
        stateFreezeEscalatedAt: null,
        stateFreezeVoiceDispatchedAt: null,
      },
    });
    result.escalationTimestampsCleared = true;
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : String(e));
  }

  return result;
}
