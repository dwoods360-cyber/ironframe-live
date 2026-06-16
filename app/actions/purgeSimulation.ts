"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { runAuditedThreatEventWormBypass } from "@/app/lib/prisma/threatEventWormBypass";
import { EventSource, ThreatState } from "@prisma/client";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { SIMULATION_CONFIG_ID } from "@/app/utils/simulationConfigConstants";
import { integrityService } from "@/src/services/integrityService";
import { MANUAL_BOARD_PURGE_FOR_TEST_BASELINE_REASON } from "@/src/constants/grcManualPurge";

const PURGE_STAND_DOWN_MS = 10 * 60 * 1000;
const PURGE_LEDGER_REASON = MANUAL_BOARD_PURGE_FOR_TEST_BASELINE_REASON;

type StandDownMap = Record<string, string>;

function parseStandDownMap(raw: unknown): StandDownMap {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as StandDownMap;
}

/**
 * Operational clear (PO 3.4): bulk-resolve open threats on **both** prod and shadow planes,
 * set per-tenant SimulationStandDown, and append a single IntegrityEvent (Bank Vault).
 * Does not delete rows or touch `auditLog`, `workNote`, `threatAssignment`, `quarantine`.
 */
export async function purgeSimulation(
  tenantUuidOverride?: string | null,
): Promise<{ ok: boolean; message: string }> {
  try {
    const tenantId = tenantUuidOverride?.trim() || (await getActiveTenantUuidFromCookies());
    if (!tenantId?.trim()) {
      return { ok: false, message: "No active tenant context for purge." };
    }
    const tid = tenantId.trim();
    const standDownUntilIso = new Date(Date.now() + PURGE_STAND_DOWN_MS).toISOString();

    const companies = await prisma.company.findMany({
      where: { tenantId: tid },
      select: { id: true },
    });
    const companyIds = companies.map((c) => c.id);

    const { prodCount, simCount } = await prisma.$transaction(async (tx) => {
      const prod =
        companyIds.length > 0
          ? await runAuditedThreatEventWormBypass({
              threatId: `tenant:${tid}`,
              eventType: "MANUAL_BOARD_PURGE",
              actorUserId: "system-purge",
              existingTx: tx,
              execute: (innerTx) =>
                innerTx.threatEvent.updateMany({
                  where: {
                    tenantCompanyId: { in: companyIds },
                    status: { not: ThreatState.RESOLVED },
                  },
                  data: { status: ThreatState.RESOLVED },
                }),
            })
          : { count: 0 };
      const sim = await tx.riskEvent.updateMany({
        where: {
          tenantId: tid,
          status: { not: ThreatState.RESOLVED },
        },
        data: { status: ThreatState.RESOLVED },
      });

      const cfg = await tx.simulationConfig.findUnique({
        where: { id: SIMULATION_CONFIG_ID },
        select: { simulationStandDownExpiresAtByTenant: true },
      });
      const prev = parseStandDownMap(cfg?.simulationStandDownExpiresAtByTenant);
      const nextMap: StandDownMap = { ...prev, [tid]: standDownUntilIso };

      await tx.simulationConfig.upsert({
        where: { id: SIMULATION_CONFIG_ID },
        create: ({
          id: SIMULATION_CONFIG_ID,
          automatedUpdatesEnabled: false,
          targetReadinessScore: 90,
          isCertified: false,
          certifiedAt: null,
          certificateStatus: "IN_PROGRESS",
          certificateIssuedAt: null,
          historicalLowestScore: 100,
          historicalLowestRecordedAt: null,
          simulationStandDownExpiresAtByTenant: nextMap as object,
        } as any),
        update: { simulationStandDownExpiresAtByTenant: nextMap as object },
      });

      await integrityService.logEvent(tx, {
        tenantId: tid,
        eventType: "MANUAL_BOARD_PURGE",
        entityType: "SIMULATION_CONFIG",
        entityId: SIMULATION_CONFIG_ID,
        actorUserId: "system-purge",
        source: EventSource.SYSTEM,
        payload: {
          reason: PURGE_LEDGER_REASON,
          threatEventsResolved: prod.count,
          simThreatEventsResolved: sim.count,
          simulationStandDownUntil: standDownUntilIso,
        },
      });

      return { prodCount: prod.count, simCount: sim.count };
    });

    console.log("[PURGE] Operational clear:", {
      threat_events_resolved: prodCount,
      sim_threat_events_resolved: simCount,
      simulation_stand_down_until: standDownUntilIso,
      tenant_id: tid,
    });

    revalidatePath("/", "layout");
    revalidatePath("/");
    revalidatePath("/reports");

    return {
      ok: true,
      message: `Operational clear complete. ${prodCount} prod + ${simCount} shadow threat row(s) marked RESOLVED. Stand-down until ${standDownUntilIso}.`,
    };
  } catch (e) {
    console.error("purgeSimulation", e);
    return { ok: false, message: String(e) };
  }
}

/**
 * Dashboard Purge chip: bulk-resolves non-RESOLVED `ThreatEvent` rows, then revalidates shell + home.
 */
export async function purgeAllDataAction(
  tenantUuidOverride?: string | null,
): Promise<{ ok: boolean; message: string }> {
  const result = await purgeSimulation(tenantUuidOverride);
  if (result.ok) {
    revalidatePath("/", "layout");
    revalidatePath("/");
  }
  return result;
}
