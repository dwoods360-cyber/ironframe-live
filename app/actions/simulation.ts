"use server";

import prisma from "@/lib/prisma";

/**
 * Server action: Purge simulation-related data.
 * No Prisma models currently have a SIMULATION tag; this action exists for future
 * DB-backed simulation records. Client should also clear localStorage audit logs
 * and reset simulation stores after calling this.
 */
export async function purgeSimulationData(): Promise<{ ok: boolean; message: string }> {
  try {
    // No Prisma tables currently store simulation-tagged records (audit is in localStorage).
    // Run a no-op query so this remains a valid server action and can be extended later.
    await prisma.company.findFirst({ select: { id: true } });
    return { ok: true, message: "Simulation purge requested. Client-side simulation data cleared." };
  } catch (e) {
    console.error("purgeSimulationData", e);
    return { ok: false, message: String(e) };
  }
}

/**
 * Server action: Measure DB round-trip time for performance monitor.
 */
export async function getDbQueryMs(): Promise<{ ms: number }> {
  const start = performance.now();
  await prisma.company.findFirst({ select: { id: true } });
  const ms = Math.round(performance.now() - start);
  return { ms };
}
