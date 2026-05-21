"use server";

import { toIntegrityHubSyntheticTarget } from "@/app/lib/integritySyntheticTargetsSerialize";
import type { IntegrityHubSyntheticTarget } from "@/app/types/integrityVault";
import prisma from "@/lib/prisma";

/** Tier 3 shadow roster — full table read for Integrity Hub (simulation targets only). */
export async function listIntegritySyntheticTargetsAction(): Promise<
  | { ok: true; targets: IntegrityHubSyntheticTarget[] }
  | { ok: false; targets: []; error: string }
> {
  try {
    const rows = await prisma.syntheticEmployee.findMany({
      orderBy: [{ monetaryValue: "desc" }, { clearanceLevel: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        clearanceLevel: true,
        vulnerabilityScore: true,
        monetaryValue: true,
        totalLossIncurred: true,
        lastAttackedAt: true,
        isHardened: true,
        status: true,
      },
    });
    return { ok: true, targets: rows.map(toIntegrityHubSyntheticTarget) };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load synthetic employees";
    console.error("[listIntegritySyntheticTargetsAction]", e);
    return { ok: false, targets: [], error: message };
  }
}
