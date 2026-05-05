import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

/**
 * Gate 7 finality: Ironscribe + Irontally append lessons-learned ReasoningLog rows and return
 * strategic recommendation bullets for the NIST-oriented post-mortem PDF.
 */
export async function appendLessonsLearnedReasoningAndStrategicBlock(
  threatId: string,
): Promise<string> {
  const row = await prisma.riskEvent.findFirst({
    where: { id: threatId },
    include: { reasoningLogs: { orderBy: { createdAt: "asc" } } },
  });
  if (!row) return "";

  const auditTail = await prisma.auditLog.findMany({
    where: { simThreatId: threatId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { action: true, justification: true, operatorId: true },
  });

  const haystack = `${row.title} ${row.sourceAgent} ${row.ingestionDetails != null ? JSON.stringify(row.ingestionDetails) : ""}`.toUpperCase();
  const ingestion =
    row.ingestionDetails && typeof row.ingestionDetails === "object" && !Array.isArray(row.ingestionDetails)
      ? (row.ingestionDetails as Record<string, unknown>)
      : {};
  const predictiveFidelity =
    ingestion.predictiveFidelity &&
    typeof ingestion.predictiveFidelity === "object" &&
    !Array.isArray(ingestion.predictiveFidelity)
      ? (ingestion.predictiveFidelity as Record<string, unknown>)
      : null;
  const accuracyScore =
    predictiveFidelity && typeof predictiveFidelity.predictionAccuracyScorePct === "number"
      ? predictiveFidelity.predictionAccuracyScorePct
      : null;
  const bullets: string[] = [];

  if (/\b(?:\d{1,3}\.){3}\d{1,3}\b|IP\s*RANGE|BLOCKED\s*IP|CIDR/i.test(haystack)) {
    bullets.push(
      "Update WAF / edge policy (e.g. rule family 400-series) to deny enumerated hostile IP ranges correlated with this ingress trace.",
    );
  }
  if (/CREDENTIAL|PASSWORD|AUTH|MFA|STUFFING/i.test(haystack)) {
    bullets.push(
      "Initiate mandatory password reset or MFA enforcement for the affected identity segment; validate IdP conditional access parity.",
    );
  }
  if (/PHISH|SPEAR|CEO|HELPDESK/i.test(haystack)) {
    bullets.push(
      "Deploy targeted phishing simulation and executive briefing for the impacted business unit within the current audit quarter.",
    );
  }
  if (/QUARANTINE|IRONLOCK|CONTAIN/i.test(haystack)) {
    bullets.push(
      "Reconcile DMZ quarantine runbooks with observed containment latency; tune escalation thresholds if SLA drift exceeds tolerance.",
    );
  }

  const pivots = row.reasoningLogs.filter((r) => r.isCorrection);
  if (pivots.length > 0) {
    bullets.push(
      `Codify detection tuning from ${pivots.length} self-correction pivot(s) recorded in ReasoningLog to reduce recurrence (Ironsight feedback loop).`,
    );
  }

  if (auditTail.some((a) => String(a.action).includes("HANDOFF"))) {
    bullets.push(
      "Verify custody chain-of-custody entries against SOC 2 CC6.1 mapping for any referral beyond primary assignee.",
    );
  }

  if (accuracyScore != null && accuracyScore < 50) {
    const divergencePoints = Array.isArray(predictiveFidelity?.divergencePoints)
      ? (predictiveFidelity?.divergencePoints as unknown[])
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
          .join(", ")
      : "unpredicted lateral path";
    bullets.push(
      `Strategic Pivot Note (Ironscribe): Prediction fidelity fell to ${accuracyScore.toFixed(
        2,
      )}%. Initial forecast bias favored prior ingress signatures; self-correction loop reoriented agents to ${divergencePoints} and restored defensive posture.`,
    );
  }

  if (bullets.length === 0) {
    bullets.push(
      "Maintain quarterly tabletop exercises aligned with NIST SP 800-61 preparation and detection/analysis phases.",
    );
    bullets.push(
      "Schedule cross-functional review of autonomous escalation composite Sm = (V x P) + B_radius against observed severity bands.",
    );
  }

  const strategicBlock = bullets.map((b, i) => `${i + 1}. ${b}`).join("\n");

  const ironscribePlan: Prisma.JsonObject = {
    lessonsLearned: true,
    gate: "POST_RESOLUTION_STRATEGIC_REVIEW",
    nistReference: "SP 800-61 Rev. 2 — Post-Incident Activity",
    recommendations: bullets,
  };

  const tallyPlan: Prisma.JsonObject = {
    lessonsLearned: true,
    gate: "POST_RESOLUTION_EXPORT_COMPLIANCE",
    recentGateActions: auditTail.slice(0, 8).map((a) => `${a.action}:${a.operatorId}`),
  };

  await prisma.reasoningLog.create({
    data: {
      threatId,
      agentName: "Ironscribe",
      escalationLogic: "LESSONS_LEARNED | Sm=(V×P)+B_radius constitutional synthesis",
      plan: ironscribePlan,
      reasoning: `Gate 7 strategic closure (Ironscribe). Recommendations:\n${strategicBlock}`,
      confidence: 0.94,
      isCorrection: false,
      operationalMode: "AUTONOMOUS",
    },
  });

  await prisma.reasoningLog.create({
    data: {
      threatId,
      agentName: "Irontally",
      escalationLogic: "LESSONS_LEARNED | audit export & tally reconciliation",
      plan: tallyPlan,
      reasoning: `Irontally: sampled ${auditTail.length} recent AuditLog gates for export completeness; retain artifacts per SOC 2 CC7.2 / ISO 27001 A.12.`,
      confidence: 0.91,
      isCorrection: false,
      operationalMode: "AUTONOMOUS",
    },
  });

  return strategicBlock;
}
