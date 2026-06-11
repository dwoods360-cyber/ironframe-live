"use server";

import prisma from "@/lib/prisma";
import { ThreatState } from "@prisma/client";
import { getCompanyIdForActiveTenant } from "@/app/lib/grc/clearanceThreatResolve";
import { SENTINEL_INSTRUCTION_MAX_LENGTH } from "@/app/utils/sentinelInstructionGate";
import {
  containsIngressShellEscapeVector,
  neutralizeIngressShellMetachars,
} from "@/app/utils/ingressEscapeNeutralizer";

export type SentinelSweepCheckStatus = "PASS" | "WARN" | "FAIL";

export type SentinelSweepCheckItem = {
  agentIndex: number;
  agentName: string;
  status: SentinelSweepCheckStatus;
  detail: string;
};

const SPOTLIGHT_ROSTER: ReadonlyArray<{ index: number; name: string; role: string }> = [
  { index: 1, name: "Ironcore", role: "Orchestrator routing" },
  { index: 8, name: "Ironsight", role: "CVE polling & blast-radius" },
  { index: 11, name: "Ironintel", role: "Read-only OSINT handoff" },
  { index: 13, name: "Ironwatch", role: "Anomaly hunter" },
  { index: 14, name: "Irongate", role: "DMZ sanitizer" },
];

/**
 * Read-only Sentinel sweep readiness — tenant derived from session cookie only.
 * No threat writes, no Irontrust math, no ale_baseline mutation.
 */
export async function runSentinelSweepReadinessAction(
  instruction: string,
): Promise<
  | { ok: true; items: SentinelSweepCheckItem[] }
  | { ok: false; error: string }
> {
  const trimmed = neutralizeIngressShellMetachars(instruction);
  if (!trimmed) {
    return { ok: false, error: "Agent instruction is required." };
  }
  if (trimmed.length > SENTINEL_INSTRUCTION_MAX_LENGTH) {
    return { ok: false, error: "Agent instruction exceeds maximum length." };
  }
  if (containsIngressShellEscapeVector(instruction)) {
    return { ok: false, error: "Instruction contains blocked escape vectors." };
  }

  const companyId = await getCompanyIdForActiveTenant();
  if (companyId == null) {
    return { ok: false, error: "Missing company context for tenant isolation." };
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { tenantId: true, name: true },
  });
  if (!company?.tenantId) {
    return { ok: false, error: "Missing tenant boundary for sweep." };
  }

  const tenantId = company.tenantId;

  const [openProdThreats, openSimThreats, evidenceCount] = await Promise.all([
    prisma.threatEvent.count({
      where: {
        tenantCompanyId: companyId,
        status: { not: ThreatState.RESOLVED },
      },
    }),
    prisma.riskEvent.count({
      where: {
        tenantId,
        status: { not: ThreatState.RESOLVED },
      },
    }),
    prisma.evidenceAttachment.count({
      where: { tenantId },
    }),
  ]);

  const openThreats = openProdThreats + openSimThreats;
  const instructionPreview =
    trimmed.length > 64 ? `${trimmed.slice(0, 61)}…` : trimmed;

  const items: SentinelSweepCheckItem[] = SPOTLIGHT_ROSTER.map((agent) => {
    switch (agent.index) {
      case 1:
        return {
          agentIndex: agent.index,
          agentName: agent.name,
          status: "PASS",
          detail: `Routing context bound to ${company.name} · instruction queued (${instructionPreview.length} chars).`,
        };
      case 8:
        return {
          agentIndex: agent.index,
          agentName: agent.name,
          status: openThreats > 12 ? "WARN" : "PASS",
          detail:
            openThreats > 12
              ? `${openThreats} open tenant threats — elevated CVE sweep load.`
              : `${openThreats} open tenant threats within nominal sweep window.`,
        };
      case 11:
        return {
          agentIndex: agent.index,
          agentName: agent.name,
          status: evidenceCount === 0 ? "WARN" : "PASS",
          detail:
            evidenceCount === 0
              ? "No OSINT evidence attachments for tenant — handoff will be citation-only."
              : `${evidenceCount} read-only evidence note(s) indexed for Irongate handoff.`,
        };
      case 13:
        return {
          agentIndex: agent.index,
          agentName: agent.name,
          status: openThreats > 20 ? "WARN" : "PASS",
          detail: "Tenant-scoped anomaly scan channel ready (read-only preview).",
        };
      case 14:
        return {
          agentIndex: agent.index,
          agentName: agent.name,
          status: "PASS",
          detail: "DMZ ingress gate armed — authorize path remains separate from sweep.",
        };
      default:
        return {
          agentIndex: agent.index,
          agentName: agent.name,
          status: "PASS",
          detail: agent.role,
        };
    }
  });

  return { ok: true, items };
}
