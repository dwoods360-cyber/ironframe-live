import "server-only";

import { ThreatState } from "@prisma/client";
import prisma from "@/lib/prisma";
import { CORE_WORKFORCE_AGENTS } from "@/app/config/agents";
import { getExpertAssigneeKey } from "@/app/config/expertAgentPersona";
import type { IntegrityVaultSnapshot, WorkforceLkgStatus } from "@/app/types/integrityVault";

const LKG_WORKFORCE_ROSTER = CORE_WORKFORCE_AGENTS.map((a) => a.name);

/** Ironscout directive — valid health observation window (hours as fractional bound). */
export const WORKFORCE_HEALTH_TTL_MIN_H = 0.5;
export const WORKFORCE_HEALTH_TTL_MAX_H = 71.75;

const MIN_TTL_MS = WORKFORCE_HEALTH_TTL_MIN_H * 60 * 60 * 1000;
const MAX_TTL_MS = WORKFORCE_HEALTH_TTL_MAX_H * 60 * 60 * 1000;

/** Ironwatch authority label for Directive Pulse Check rows (audit JSON / ops copy). */
export const IRONWATCH_PULSE_AUTHORITY = "Ironwatch" as const;

const ACTIVE_THREAT_STATUSES: ThreatState[] = [
  ThreatState.IDENTIFIED,
  ThreatState.CONFIRMED,
  ThreatState.MITIGATED,
];

async function agentHasRecordedActions(agentCanon: string): Promise<boolean> {
  const op = await prisma.agentOperation.count({
    where: { agentName: { equals: agentCanon, mode: "insensitive" } },
  });
  const reasoning = await prisma.agentReasoning.count({
    where: { agentId: { equals: agentCanon, mode: "insensitive" } },
  });
  return op + reasoning > 0;
}

async function agentConsideredWorkloadActive(agentCanon: string): Promise<boolean> {
  const assigneeKey = getExpertAssigneeKey(agentCanon);
  const prod = await prisma.threatEvent.count({
    where: {
      status: { in: ACTIVE_THREAT_STATUSES },
      OR: [
        { assigneeId: assigneeKey },
        { sourceAgent: { equals: agentCanon, mode: "insensitive" } },
      ],
    },
  });
  const sim = await prisma.riskEvent.count({
    where: {
      status: { in: ACTIVE_THREAT_STATUSES },
      OR: [
        { assigneeId: assigneeKey },
        { sourceAgent: { equals: agentCanon, mode: "insensitive" } },
      ],
    },
  });
  return prod + sim > 0;
}

/** Map persisted registry string → Integrity Hub workforce pill union. */
function registryStatusToUi(raw: string): WorkforceLkgStatus {
  if (raw === "DRIFT_DETECTED") return "RE_VERIFICATION_REQUIRED";
  if (
    raw === "NO_ENTRY" ||
    raw === "LKG_VERIFIED" ||
    raw === "RE_VERIFICATION_REQUIRED"
  ) {
    return raw;
  }
  return "NO_ENTRY";
}

/**
 * LKG workforce handshake: upsert 19 roster agents, apply Ironscout TTL band (0.5h–71.75h on lastHealthCheck),
 * then Ironwatch Directive Pulse Check when workload is active but no persisted AgentOperation / AgentReasoning rows.
 */
export async function performWorkforceAudit(): Promise<void> {
  for (const name of LKG_WORKFORCE_ROSTER) {
    await prisma.agentRegistry.upsert({
      where: { agentName: name },
      create: { agentName: name },
      update: {},
    });
  }

  const rows = await prisma.agentRegistry.findMany();

  for (const row of rows) {
    const canon = row.agentName;

    const pulseEligible =
      (await agentConsideredWorkloadActive(canon)) && !(await agentHasRecordedActions(canon));

    if (pulseEligible) {
      const pulseAnchor = new Date(Date.now() - MIN_TTL_MS - 60_000);
      await prisma.agentRegistry.update({
        where: { id: row.id },
        data: {
          lastHealthCheck: pulseAnchor,
          status: "LKG_VERIFIED",
        },
      });
      continue;
    }

    const last = row.lastHealthCheck;
    const ageMs = Date.now() - last.getTime();
    let next: string;
    if (ageMs < MIN_TTL_MS) {
      next = "NO_ENTRY";
    } else if (ageMs <= MAX_TTL_MS) {
      next = "LKG_VERIFIED";
    } else {
      next = "RE_VERIFICATION_REQUIRED";
    }

    await prisma.agentRegistry.update({
      where: { id: row.id },
      data: { status: next },
    });
  }
}

/** Overlay DB workforce registry status onto manifest-derived snapshot rows. */
export async function mergeAgentRegistryIntoSnapshot(
  snapshot: IntegrityVaultSnapshot,
): Promise<IntegrityVaultSnapshot> {
  const registry = await prisma.agentRegistry.findMany();
  const byName = new Map(registry.map((r) => [r.agentName.toLowerCase(), r]));
  const agents = snapshot.agents.map((a) => {
    const reg = byName.get(a.name.toLowerCase());
    if (!reg) return a;
    return {
      ...a,
      status: registryStatusToUi(reg.status),
      lastVerifiedAtUtc: reg.lastHealthCheck.toISOString(),
    };
  });
  return { ...snapshot, agents };
}
