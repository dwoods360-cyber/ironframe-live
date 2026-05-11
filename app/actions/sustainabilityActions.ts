"use server";

import prisma from "@/lib/prisma";
import { ThreatState } from "@prisma/client";

/** High tier: 1–10 severity 8–10, or 0–100 scale ≥80. */
function isHighSeverity(score: number): boolean {
  if (score >= 8 && score <= 10) return true;
  if (score > 10 && score >= 80) return true;
  return false;
}

/**
 * Records **Ironbloom** (production CSRD) sustainability impact when a threat is mitigated (RESOLVED).
 *
 * **TAS / physical units:** This path only persists kWh, liters (cooling water), and CO₂e mass (grams). It does not
 * accept monetary-only carbon or USD-denominated “offsets”. Any future ingestion MUST validate physical quantities
 * before calling this function; reject payloads that only carry currency fields.
 *
 * Idempotent per threat via upsert on `threatId`.
 */
export async function recordSustainabilityImpact(
  threatId: string,
): Promise<
  | { ok: true; recorded: true }
  | { ok: true; recorded: false; reason: "not_found" | "not_resolved" }
  | { ok: false; error: string }
> {
  try {
    const threat = await prisma.threatEvent.findUnique({
      where: { id: threatId },
      select: { id: true, score: true, status: true },
    });
    if (!threat) {
      return { ok: true, recorded: false, reason: "not_found" };
    }
    if (threat.status !== ThreatState.RESOLVED) {
      return { ok: true, recorded: false, reason: "not_resolved" };
    }

    const high = isHighSeverity(threat.score);
    const kwhAverted = high ? 2500n : 500n;
    const carbonOffsetGrams = high ? 1500n : 300n;
    const coolingWaterLiters = Number(kwhAverted) * 1.8;

    await prisma.sustainabilityMetric.upsert({
      where: { threatId },
      create: {
        threatId,
        kwhAverted,
        coolingWaterLiters,
        carbonOffsetGrams,
      },
      update: {
        kwhAverted,
        coolingWaterLiters,
        carbonOffsetGrams,
      },
    });

    return { ok: true, recorded: true };
  } catch (e) {
    console.error("[sustainabilityActions] recordSustainabilityImpact:", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
