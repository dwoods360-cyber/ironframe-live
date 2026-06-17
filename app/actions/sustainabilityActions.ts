"use server";

import prisma from "@/lib/prisma";
import { runAuditedThreatEventWormBypass } from "@/app/lib/prisma/threatEventWormBypass";
import { computeSustainabilityAleForTenantUuid } from "@/app/services/ironbloom/scoring";
import { computeTotalSocietalValueCents } from "@/app/services/ironbloom/tsvCalculator";
import { lockCarbonScore } from "@/src/services/ironbloom/artifactLock";
import { runDirtyGridMonitorForTenant } from "@/src/services/agents/ironlock/dirtyGridMonitor";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";
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
 * **Sustainability ALE:** `ALE_carbon = (kWh × CI_gCO₂) × P_offset × R_tax` → `mitigatedValueCents` (BigInt).
 * Monetary-only payloads raise `CRITICAL_INGESTION_FAILURE` via Agent 18 scoring gate.
 *
 * Idempotent per threat via upsert on `threatId`.
 */
export async function recordSustainabilityImpact(
  threatId: string,
): Promise<
  | { ok: true; recorded: true; mitigatedValueCents: string; carbonShareOfTenantAleBps: string }
  | { ok: true; recorded: false; reason: "not_found" | "not_resolved" }
  | { ok: false; error: string; code?: string }
> {
  try {
    const threat = await prisma.threatEvent.findUnique({
      where: { id: threatId },
      select: {
        id: true,
        score: true,
        status: true,
        targetEntity: true,
        tenantCompanyId: true,
      },
    });
    if (!threat) {
      return { ok: true, recorded: false, reason: "not_found" };
    }
    if (threat.status !== ThreatState.RESOLVED) {
      return { ok: true, recorded: false, reason: "not_resolved" };
    }

    const high = isHighSeverity(threat.score);
    const kwhAverted = high ? 2500 : 500;
    const carbonOffsetGrams = high ? 1500n : 300n;
    const coolingWaterLiters = kwhAverted * 1.8;
    const assetId = threat.targetEntity?.trim() || threat.id;

    const company = threat.tenantCompanyId
      ? await prisma.company.findUnique({
          where: { id: threat.tenantCompanyId },
          select: { tenantId: true },
        })
      : null;
    const tenantUuid = company?.tenantId;
    if (!tenantUuid) {
      return { ok: false, error: "Threat has no tenant scope for sustainability scoring." };
    }

    const ale = await computeSustainabilityAleForTenantUuid({
      tenantUuid,
      unitsKwh: kwhAverted,
      assetId,
    });

    const metricTonsCo2e = Number(carbonOffsetGrams) / 1_000_000;
    const tsv = computeTotalSocietalValueCents(metricTonsCo2e, ale.mitigatedValueCents);

    const recordedAt = new Date().toISOString();
    await lockCarbonScore(
      {
        threatId,
        kwhAverted: BigInt(kwhAverted),
        coolingWaterLiters,
        carbonOffsetGrams,
        mitigatedValueCents: ale.mitigatedValueCents,
        totalSocietalValueCents: tsv.societalValueCents,
        createdAt: new Date(recordedAt),
        carbonIntensityGco2PerKwh: ale.carbonIntensityGco2PerKwh,
        zone: ale.zone,
      },
      tenantUuid,
    );

    await runDirtyGridMonitorForTenant(tenantUuid, {
      mitigatedValueCents: ale.mitigatedValueCents,
    });

    await prisma.$transaction(async (tx) => {
      await tx.sustainabilityMetric.upsert({
        where: { threatId },
        create: {
          threatId,
          kwhAverted: BigInt(kwhAverted),
          coolingWaterLiters,
          carbonOffsetGrams,
          mitigatedValueCents: ale.mitigatedValueCents,
          totalSocietalValueCents: tsv.societalValueCents,
        },
        update: {
          kwhAverted: BigInt(kwhAverted),
          coolingWaterLiters,
          carbonOffsetGrams,
          mitigatedValueCents: ale.mitigatedValueCents,
          totalSocietalValueCents: tsv.societalValueCents,
        },
      });
      await runAuditedThreatEventWormBypass({
        threatId,
        eventType: "SUSTAINABILITY_MITIGATED_VALUE_STAMP",
        actorUserId: "IRONLOCK_AGENT_6",
        existingTx: tx,
        execute: (innerTx) =>
          innerTx.threatEvent.update({
            where: { id: threatId },
            data: { mitigatedValueCents: ale.mitigatedValueCents },
          }),
      });
    });

    try {
      await auditLogCreateLoose({
        data: {
          action: "TOTAL_SOCIETAL_VALUE_SEALED",
          justification: JSON.stringify({
            event: "SOCIETAL_VALUE_FORENSIC_WITNESS",
            ironlockAgent: "IRONLOCK_AGENT_6",
            ironethicAgent: "IRONETHIC_AGENT_17",
            threatId,
            metricTonsCo2e,
            sccComponentCents: tsv.sccComponentCents.toString(),
            internalRoiCents: ale.mitigatedValueCents.toString(),
            totalSocietalValueCents: tsv.societalValueCents.toString(),
            epaSccBenchmark: "US-EPA-2026-SCC-interim-190-USD-per-tCO2e",
          }),
          operatorId: "IRONLOCK_AGENT_6",
          threatId,
          tenantId: tenantUuid,
          isSimulation: false,
        },
      });
    } catch {
      /* best-effort witness */
    }

    return {
      ok: true,
      recorded: true,
      mitigatedValueCents: ale.mitigatedValueCents.toString(),
      carbonShareOfTenantAleBps: ale.carbonShareOfTenantAleBps.toString(),
    };
  } catch (e) {
    console.error("[sustainabilityActions] recordSustainabilityImpact:", e);
    const code =
      e != null && typeof e === "object" && "code" in e
        ? String((e as { code: string }).code)
        : undefined;
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      code,
    };
  }
}
