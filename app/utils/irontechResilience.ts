/**
 * Server-only: Retry-3-then-Escalate for high-risk agent work. Persists to `AgentOperation`.
 * Attempt 2: AuditLog / AgentOperation local pattern first; if none, Ironintel OSINT, then retry.
 * Attempt 3: final retry; on failure → Phone Home.
 */
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { AgentOperationStatus, ThreatState } from "@prisma/client";
import { recordSustainabilityImpact } from "@/app/actions/sustainabilityActions";
import { commitPhoneHome, sendPhoneHomeEmail } from "@/app/actions/phoneHomeActions";
import { recordResilienceIntelStreamLine } from "@/app/actions/resilienceIntelStreamActions";
import { Ironintel } from "@/app/lib/ironintel";
import { isChaosActive, poisonAgentOperationWithChaos, threatIsChaosTest } from "@/app/utils/ironchaos";
import {
  mergeIngestionDetailsPatch,
  parseIngestionDetailsForMerge,
} from "@/app/utils/ingestionDetailsMerge";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
/** Pause between retry attempts so Log-Dive / OSINT phases are visible in the UI. */
const RETRY_ATTEMPT_GAP_MS = 3000;

export type ExecuteWithRetryResult =
  | { ok: true; completed: true }
  | { ok: false; escalated: true; error: string }
  | { ok: false; completed: false; error: string };

type SnapshotFailures = { failures: Array<{ attempt: number; error: string; at: string }> };

async function patchSnapshotDiagnostic(
  threatId: string,
  agentName: string,
  diagnosticPatch: Record<string, unknown>,
): Promise<void> {
  const row = await prisma.agentOperation.findUnique({
    where: { threatId_agentName: { threatId, agentName } },
    select: { snapshot: true },
  });
  const prev =
    row?.snapshot && typeof row.snapshot === "object" && row.snapshot !== null
      ? (row.snapshot as Record<string, unknown>)
      : {};
  const dh = {
    ...(typeof prev.diagnosticHierarchy === "object" && prev.diagnosticHierarchy !== null
      ? (prev.diagnosticHierarchy as Record<string, unknown>)
      : {}),
    ...diagnosticPatch,
  };
  const next = { ...prev, diagnosticHierarchy: dh };
  await prisma.agentOperation.update({
    where: { threatId_agentName: { threatId, agentName } },
    data: { snapshot: next as Prisma.InputJsonValue },
  });
}

/** Attempt 2 priority: internal AuditLog + AgentOperation signals (30d THREAT_RESOLVED peers). */
async function findLocalResolutionPattern(threatId: string): Promise<boolean> {
  const current = await prisma.threatEvent.findUnique({
    where: { id: threatId },
    select: { sourceAgent: true, targetEntity: true, title: true },
  });
  if (!current) return false;

  const priorCompleted = await prisma.agentOperation.count({
    where: {
      threatId,
      status: AgentOperationStatus.COMPLETED,
    },
  });
  if (priorCompleted > 0) return true;

  const since = new Date(Date.now() - THIRTY_DAYS_MS);
  const resolvedLogs = await prisma.auditLog.findMany({
    where: {
      action: "THREAT_RESOLVED",
      createdAt: { gte: since },
      threatId: { not: null },
    },
    select: { threatId: true },
  });

  const otherIds = [
    ...new Set(
      resolvedLogs
        .map((l) => l.threatId)
        .filter((id): id is string => id != null && id !== threatId),
    ),
  ];
  if (otherIds.length === 0) return false;

  const similar = await prisma.threatEvent.findMany({
    where: {
      id: { in: otherIds },
      OR: [{ sourceAgent: current.sourceAgent }, { targetEntity: current.targetEntity }],
    },
    select: { id: true },
  });

  return similar.length > 0;
}

/**
 * Merges `irontechLive` into `ThreatEvent.ingestionDetails` so Supabase Realtime UPDATE
 * streams each failed attempt to the dashboard (Sprint 6.17+).
 */
async function streamIrontechAttemptToThreatEvent(
  threatId: string,
  params: { attempt: number; maxAttempts: number; error: string; agentName: string },
): Promise<void> {
  const tid = threatId.trim();
  if (!tid) return;
  try {
    const row = await prisma.threatEvent.findUnique({
      where: { id: tid },
      select: { ingestionDetails: true },
    });
    const base = parseIngestionDetailsForMerge(row?.ingestionDetails);
    const prevLiveRaw = base.irontechLive;
    const prevLive =
      prevLiveRaw !== null && typeof prevLiveRaw === "object" && !Array.isArray(prevLiveRaw)
        ? (prevLiveRaw as Record<string, unknown>)
        : {};
    const prevAttempts = Array.isArray(prevLive.attempts) ? (prevLive.attempts as unknown[]) : [];
    const errShort = params.error.slice(0, 400);
    const at = new Date().toISOString();
    const entry = {
      attempt: params.attempt,
      max: params.maxAttempts,
      error: errShort,
      at,
    };
    const attempts = [...prevAttempts, entry];
    const streamSeq = (typeof prevLive.streamSeq === "number" ? prevLive.streamSeq : 0) + 1;
    const lastTerminalLine = `> [IRONTECH] Attempt ${params.attempt}/${params.maxAttempts} failed: ${errShort.slice(0, 120)}`;
    const irontechLive = {
      streamSeq,
      lastTerminalLine,
      attempts,
      agentName: params.agentName,
      streamedAt: at,
    };
    const merged = mergeIngestionDetailsPatch(row?.ingestionDetails ?? null, {
      irontechLive: irontechLive as unknown as Prisma.InputJsonValue,
    });
    await prisma.threatEvent.update({
      where: { id: tid },
      data: { ingestionDetails: merged },
    });
  } catch (e) {
    console.warn("[Irontech] streamIrontechAttemptToThreatEvent skipped:", e);
  }
}

function mergeFailuresIntoSnapshot(
  prev: unknown,
  attempt: number,
  error: string,
): Record<string, unknown> {
  const prevObj =
    prev && typeof prev === "object" && prev !== null ? (prev as Record<string, unknown>) : {};
  const oldFailures = Array.isArray(prevObj.failures)
    ? (prevObj.failures as SnapshotFailures["failures"])
    : [];
  const failures = [
    ...oldFailures,
    { attempt, error: error.slice(0, 8000), at: new Date().toISOString() },
  ].slice(-3);
  return { ...prevObj, failures };
}

/**
 * Pre-execution hook: persist rewind snapshot before high-risk mitigation (Ironcore / LangGraph).
 */
export async function saveCheckpoint(agentId: string, threatId: string, state: unknown): Promise<void> {
  const tid = threatId.trim();
  const agent = agentId.trim();
  if (!tid || !agent) return;
  const payload: Prisma.InputJsonValue = {
    preExecution: state as Prisma.InputJsonValue,
    savedAt: new Date().toISOString(),
  };
  await prisma.agentOperation.upsert({
    where: { threatId_agentName: { threatId: tid, agentName: agent } },
    create: {
      threatId: tid,
      agentName: agent,
      status: AgentOperationStatus.PENDING,
      attemptCount: 0,
      snapshot: payload,
    },
    update: {
      snapshot: payload,
    },
  });
}

export type ExecuteWithRetryOptions = {
  maxAttempts?: number;
  /** When true, ignores `ingestionDetails.isChaosTest` (e.g. manual 4th mitigation attempt). */
  bypassChaosTestTag?: boolean;
};

/**
 * Runs `actionFn` up to three times (configurable).
 * Attempt 2: local pattern (AuditLog / AgentOperation); if none, Ironintel OSINT, then retry.
 * Final failure: FAILED + Phone Home + ThreatState.ESCALATED.
 */
export async function executeWithRetry(
  agentName: string,
  threatId: string,
  actionFn: () => Promise<void>,
  options?: ExecuteWithRetryOptions,
): Promise<ExecuteWithRetryResult> {
  const agent = agentName.trim();
  const tid = threatId.trim();
  if (!agent || !tid) {
    return { ok: false, completed: false, error: "Missing agentName or threatId." };
  }

  const maxAttempts = options?.maxAttempts ?? 3;
  let lastError = "";
  let localPatternFound = false;

  await prisma.agentOperation.upsert({
    where: { threatId_agentName: { threatId: tid, agentName: agent } },
    create: {
      threatId: tid,
      agentName: agent,
      status: AgentOperationStatus.PENDING,
      attemptCount: 0,
    },
    update: {},
  });

  const chaosTestThreat = await threatIsChaosTest(tid);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (chaosTestThreat) {
        await poisonAgentOperationWithChaos(tid, agent, attempt);
        throw new Error("CHAOS_INTERRUPTED");
      }

      if (await isChaosActive()) {
        await poisonAgentOperationWithChaos(tid, agent, attempt);
        throw new Error("CHAOS_INTERRUPTED");
      }

      if (!chaosTestThreat && attempt === 2) {
        await patchSnapshotDiagnostic(tid, agent, { phase: "internal_lookup" });
        const irontechLine = "> [IRONTECH] Local Log-Dive initiated...";
        console.log(irontechLine);
        await recordResilienceIntelStreamLine(irontechLine, tid);
        localPatternFound = await findLocalResolutionPattern(tid);
        await patchSnapshotDiagnostic(tid, agent, {
          phase: "internal_complete",
          localPatternFound,
          ResolutionSource: localPatternFound ? "Local" : "None",
        });

        if (!localPatternFound) {
          const ironintelLine =
            "> [IRONINTEL] Local logic exhausted. Secure OSINT lookup in progress...";
          console.log(ironintelLine);
          await recordResilienceIntelStreamLine(ironintelLine, tid);
          await Ironintel.fetchSecureRemediation(tid);
          await patchSnapshotDiagnostic(tid, agent, {
            ResolutionSource: "External",
            ironintelConsulted: true,
            phase: "external_osint",
          });
        }
      }

      await actionFn();

      const resolutionSource: "Local" | "External" | "None" =
        attempt === 1 ? "None" : localPatternFound ? "Local" : "External";
      await patchSnapshotDiagnostic(tid, agent, { ResolutionSource: resolutionSource });

      await prisma.agentOperation.update({
        where: {
          threatId_agentName: { threatId: tid, agentName: agent },
        },
        data: {
          status: AgentOperationStatus.COMPLETED,
          lastError: null,
        },
      });

      const ironbloom = await recordSustainabilityImpact(tid);
      if (!ironbloom.ok) {
        console.warn("[Irontech] Sustainability hook skipped or failed:", ironbloom);
      }

      return { ok: true, completed: true };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      const row = await prisma.agentOperation.findUnique({
        where: { threatId_agentName: { threatId: tid, agentName: agent } },
        select: { snapshot: true, attemptCount: true },
      });
      const merged = mergeFailuresIntoSnapshot(row?.snapshot, attempt, lastError);
      const nextCount = attempt;
      const recoveryUi = {
        attempt: nextCount,
        max: maxAttempts,
        label: `Attempting Recovery ${nextCount}/${maxAttempts}`,
      };
      const snapshotWithUi = {
        ...merged,
        recoveryUi,
      };

      if (attempt < maxAttempts) {
        await prisma.agentOperation.update({
          where: { threatId_agentName: { threatId: tid, agentName: agent } },
          data: {
            status: AgentOperationStatus.RETRYING,
            attemptCount: nextCount,
            lastError,
            snapshot: snapshotWithUi as Prisma.InputJsonValue,
          },
        });
        await streamIrontechAttemptToThreatEvent(tid, {
          attempt,
          maxAttempts,
          error: lastError,
          agentName: agent,
        });
        await new Promise((r) => setTimeout(r, RETRY_ATTEMPT_GAP_MS));
        continue;
      }

      await prisma.agentOperation.update({
        where: { threatId_agentName: { threatId: tid, agentName: agent } },
        data: {
          status: AgentOperationStatus.FAILED,
          attemptCount: nextCount,
          lastError,
          snapshot: snapshotWithUi as Prisma.InputJsonValue,
        },
      });

      await streamIrontechAttemptToThreatEvent(tid, {
        attempt,
        maxAttempts,
        error: lastError,
        agentName: agent,
      });

      await prisma.threatEvent
        .update({
          where: { id: tid },
          data: { status: ThreatState.ESCALATED },
        })
        .catch((err) => console.warn("[Irontech] Could not set threat ESCALATED:", err));

      const finalized = await prisma.agentOperation.findUnique({
        where: { threatId_agentName: { threatId: tid, agentName: agent } },
        select: { id: true, attemptCount: true, status: true },
      });

      if (
        finalized?.id &&
        finalized.attemptCount >= maxAttempts &&
        finalized.status === AgentOperationStatus.FAILED
      ) {
        const sent = await sendPhoneHomeEmail(tid, finalized.id);
        if (sent.success) {
          const line = `> [IRONTECH] Phone Home committed. Diagnostic sent to ${sent.to}.`;
          console.log(line);
          await recordResilienceIntelStreamLine(line, tid);
        } else {
          console.warn("[IRONTECH] Phone Home: diagnostic email not delivered:", sent.error);
          await commitPhoneHome(tid);
        }
      } else {
        await commitPhoneHome(tid);
      }
      return { ok: false, escalated: true, error: lastError };
    }
  }

  return { ok: false, completed: false, error: lastError || "Retry exhausted." };
}

/** Latest rewind snapshot for a threat (prefers FAILED / RETRYING rows). */
export async function recoverLastState(threatId: string): Promise<unknown | null> {
  const tid = threatId.trim();
  if (!tid) return null;
  const row = await prisma.agentOperation.findFirst({
    where: {
      threatId: tid,
      status: {
        in: [
          AgentOperationStatus.FAILED,
          AgentOperationStatus.RETRYING,
          AgentOperationStatus.CHAOS_INTERRUPTED,
          AgentOperationStatus.ESCALATED,
        ],
      },
    },
    orderBy: { updatedAt: "desc" },
    select: { snapshot: true },
  });
  return row?.snapshot ?? null;
}
