"use server";

import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { ThreatState, SimThreatSource, ComplianceFramework } from "@prisma/client";
import { getCompanyIdForActiveTenant } from "@/app/lib/grc/clearanceThreatResolve";
import { revalidatePath } from "next/cache";

export type SentinelObservedSymptom =
  | "PERFORMANCE_DROP"
  | "UNAUTHORIZED_ACCESS"
  | "DATA_DRIFT"
  | "SERVICE_DEGRADATION"
  | "INTEGRITY_ALERT"
  | "OTHER";

type TriggerSentinelHunchInput = {
  targetAsset: string;
  observedSymptom: SentinelObservedSymptom;
  confidenceLevel: number;
  complianceFramework: "SOC2" | "ISO27001" | "NIST";
};

export async function triggerSentinelHunch(
  input: TriggerSentinelHunchInput,
): Promise<{ ok: true; threatId: string } | { ok: false; error: string }> {
  const targetAsset = input.targetAsset?.trim();
  if (!targetAsset) return { ok: false, error: "Target asset is required." };

  if (!Number.isFinite(input.confidenceLevel)) {
    return { ok: false, error: "Confidence level must be a number." };
  }
  const confidence = Math.max(0, Math.min(100, Math.round(input.confidenceLevel)));

  const companyId = await getCompanyIdForActiveTenant();
  if (companyId == null) {
    return { ok: false, error: "Missing company context for tenant isolation." };
  }

  if (!Object.values(ComplianceFramework).includes(input.complianceFramework as ComplianceFramework)) {
    return { ok: false, error: "Compliance framework selection is required." };
  }
  const complianceFramework = input.complianceFramework as ComplianceFramework;

  const mappedControls =
    complianceFramework === ComplianceFramework.ISO27001
      ? ["ISO27001 Annex A.8.2"]
      : complianceFramework === ComplianceFramework.NIST
        ? ["NIST PR.AC-3"]
        : ["SOC2 CC6.1"];

  const threat = await prisma.riskEvent.create({
    data: {
      title: `Sentinel Hypothesis: ${targetAsset}`,
      sourceAgent: "HUMAN_SENTINEL",
      source: SimThreatSource.HUMAN_SENTINEL,
      status: ThreatState.IDENTIFIED,
      severity: confidence >= 70 ? "HIGH" : confidence >= 40 ? "MEDIUM" : "LOW",
      score: Math.max(1, confidence),
      priority_score: Math.max(1, confidence),
      targetEntity: targetAsset,
      tenantCompanyId: companyId,
      threatVelocity: 1.0,
      complianceFramework,
      mappedControls,
      monitoringExpiry: null,
      ingestionDetails: {
        sentinelIntake: {
          observedSymptom: input.observedSymptom,
          confidenceLevel: confidence,
          complianceFramework,
          verificationPhaseRequired: true,
          submittedAt: new Date().toISOString(),
        },
        isDeepMonitoring: false,
      } satisfies Prisma.InputJsonValue,
    },
    select: { id: true },
  });

  revalidatePath("/");
  return { ok: true, threatId: threat.id };
}
