"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { ThreatState } from "@prisma/client";

/**
 * Operational clear (PO 3.4): bulk-resolve open threats so they drop off the active board filter.
 * Does not delete rows or touch `auditLog`, `workNote`, `threatAssignment`, `quarantine`, or `tenant`.
 */
export async function purgeSimulation(): Promise<{ ok: boolean; message: string }> {
  try {
    const updateResult = await prisma.threatEvent.updateMany({
      where: { status: { not: ThreatState.RESOLVED } },
      data: { status: ThreatState.RESOLVED },
    });

    console.log("[PURGE] Operational clear (bulk RESOLVED):", {
      threat_events_updated: updateResult.count,
    });

    revalidatePath("/", "layout");
    revalidatePath("/");
    revalidatePath("/reports");

    console.log("GRC PURGE: Operational Board Cleared Successfully");

    return {
      ok: true,
      message: `Operational clear complete. ${updateResult.count} threat event(s) marked RESOLVED.`,
    };
  } catch (e) {
    console.error("purgeSimulation", e);
    return { ok: false, message: String(e) };
  }
}

/**
 * Dashboard Purge chip: bulk-resolves non-RESOLVED `ThreatEvent` rows, then revalidates shell + home.
 */
export async function purgeAllDataAction(): Promise<{ ok: boolean; message: string }> {
  const result = await purgeSimulation();
  if (result.ok) {
    revalidatePath("/", "layout");
    revalidatePath("/");
  }
  return result;
}
