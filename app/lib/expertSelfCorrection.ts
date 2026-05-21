import "server-only";

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { normalizeIngestionDetailsToString } from "@/app/utils/ingestionDetailsMerge";
import { logThreatActivity } from "@/app/actions/auditActions";
import {
  buildDualTimestamps,
  type ExpertAgentCanonicalName,
} from "@/app/config/expertAgentPersona";
import { ironscribeClerkFormat } from "@/app/utils/ironscribeNarrative";

export type TelemetryPivotAnalysis = {
  shouldPivot: boolean;
  reason: string;
  confidence: number;
  telemetrySnapshot: Record<string, unknown>;
};

/** Deterministic pivot rules over latest threat telemetry (sim or prod row). */
export function analyzeTelemetryForPivot(row: {
  ingestionDetails: string | null;
  score: number;
  priority_score?: number | null;
}): TelemetryPivotAnalysis {
  const telemetrySnapshot: Record<string, unknown> = {
    score: row.score,
    priority_score: row.priority_score ?? null,
  };

  let parsed: Record<string, unknown> = {};
  try {
    const raw = row.ingestionDetails?.trim();
    if (raw?.startsWith("{")) {
      parsed = JSON.parse(raw) as Record<string, unknown>;
      telemetrySnapshot.ingestionPreview = Object.keys(parsed).slice(0, 12);
    }
  } catch {
    /* ignore */
  }

  const lateral =
    parsed.lateralMovementDetected === true ||
    parsed.strategicPivot === true ||
    parsed.expertObservationPivot === true ||
    (typeof parsed.observedVlan === "string" && parsed.observedVlan.toUpperCase().includes("VLAN-4"));

  const scoreHot =
    row.score >= 92 ||
    (typeof row.priority_score === "number" && row.priority_score >= 90);

  const shouldPivot = lateral || scoreHot;
  const reason = lateral
    ? "New lateral movement detected on simulated telemetry (e.g. VLAN-4 scope); abandoning prior gate plan."
    : scoreHot
      ? "Threat score / priority crossed escalation band; strategy recalibrated before next gate."
      : "Telemetry nominal — continuing constitutional gate sequence.";

  return {
    shouldPivot,
    reason,
    confidence: shouldPivot ? 0.94 : 0.78,
    telemetrySnapshot,
  };
}

export async function fetchThreatPingForObservation(
  threatId: string,
  isSim: boolean,
  tenantCompanyId: bigint,
): Promise<{
  ingestionDetails: string | null;
  score: number;
  priority_score: number | null;
} | null> {
  if (isSim) {
    const r = await prisma.riskEvent.findFirst({
      where: { id: threatId, tenantCompanyId },
      select: { ingestionDetails: true, score: true, priority_score: true },
    });
    if (!r) return null;
    return {
      ingestionDetails: normalizeIngestionDetailsToString(r.ingestionDetails) ?? null,
      score: r.score,
      priority_score: r.priority_score ?? null,
    };
  }
  const r = await prisma.threatEvent.findFirst({
    where: { id: threatId, tenantCompanyId },
    select: { ingestionDetails: true, score: true },
  });
  if (!r) return null;
  return {
    ingestionDetails: r.ingestionDetails,
    score: r.score,
    priority_score: null,
  };
}

/**
 * Expert observation loop: ping telemetry → analyze → optional ReasoningLog + Ironscribe audit (sim: ReasoningLog FK).
 */
export async function executeExpertSelfCorrectingObservation(args: {
  threatId: string;
  tenantCompanyId: bigint;
  isSim: boolean;
  gateStep: number;
  activeAgent: ExpertAgentCanonicalName;
}): Promise<{ pivoted: boolean }> {
  const row = await fetchThreatPingForObservation(
    args.threatId,
    args.isSim,
    args.tenantCompanyId,
  );
  if (!row) return { pivoted: false };

  const analysis = analyzeTelemetryForPivot(row);
  if (!analysis.shouldPivot) return { pivoted: false };

  const dual = buildDualTimestamps();

  if (args.isSim) {
    const pDecimal =
      typeof row.priority_score === "number"
        ? (row.priority_score / 100).toFixed(2)
        : "0.95";
    const escalationLogic = `(V:${analysis.confidence.toFixed(2)} * P:${pDecimal}) + B:${row.score}`;

    const planJson: Prisma.JsonObject = {
      gateStep: args.gateStep,
      strategy: "STRATEGIC_PIVOT",
      steps: [
        "Freeze prior gate assumptions",
        "Reconcile ingestion delta",
        "Resume lifecycle under revised posture",
      ],
      telemetrySnapshot: analysis.telemetrySnapshot as Prisma.JsonValue,
    };

    await prisma.reasoningLog.create({
      data: {
        threatId: args.threatId,
        agentName: args.activeAgent,
        escalationLogic,
        plan: planJson,
        reasoning: analysis.reason,
        confidence: analysis.confidence,
        isCorrection: true,
        operationalMode: "AUTONOMOUS",
      },
    });
  }

  const ironscribeNarrative = ironscribeClerkFormat({
    agent: args.activeAgent,
    action: "AGENT_PIVOT",
    rawFacts: `${analysis.reason} Confidence band ${analysis.confidence.toFixed(2)}.`,
  });

  const details = JSON.stringify({
    ironscribeNarrative,
    gateStep: args.gateStep,
    pivotReason: analysis.reason,
    newConfidence: analysis.confidence,
    timestampUtc: dual.timestampUtc,
    timestampLocal: dual.timestampLocal,
    strategicPivot: true,
    hudAlert: "STRATEGIC_PIVOT",
  });

  if (args.isSim) {
    await logThreatActivity(null, "AGENT_PIVOT", details, {
      isSimulation: true,
      simThreatId: args.threatId,
      operatorId: "Ironscribe",
    });
  } else {
    await logThreatActivity(args.threatId, "AGENT_PIVOT", details, {
      operatorId: "Ironscribe",
    });
  }

  return { pivoted: true };
}
