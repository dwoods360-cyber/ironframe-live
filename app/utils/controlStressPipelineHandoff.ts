import { isControlStressTestIngestion } from "@/app/utils/controlStressTestIngestion";
import type { PipelineThreat } from "@/app/store/riskStore";

const SESSION_KEY = "ironframe-control-stress-pipeline-handoff";

export type ControlStressHandoffPayload = {
  threatId: string;
  controlId: string;
  createdAt: string;
};

export function buildOptimisticControlStressPipelineThreat(
  controlId: string,
  threatId: string,
): PipelineThreat {
  const trimmedControl = controlId.trim();
  const trimmedId = threatId.trim();
  const targetAsset = `Control Stress Test :: ${trimmedControl}`;
  const now = new Date().toISOString();
  const ingestionDetails = JSON.stringify({
    controlStressTest: true,
    controlStressTestControlId: trimmedControl,
    sourcePlane: "MANUAL",
    threadId: trimmedId,
    orchestrationThreadId: trimmedId,
    sentinelIntake: { verificationPhaseRequired: true },
    handoffPending: true,
  });

  return {
    id: trimmedId,
    name: `Sentinel Hypothesis: ${targetAsset}`,
    loss: 0,
    score: 88,
    industry: targetAsset,
    target: targetAsset,
    source: "HUMAN_SENTINEL",
    sourceAgent: "HUMAN_SENTINEL",
    description: `Liability: $0.0M · HUMAN_SENTINEL`,
    threatStatus: "IDENTIFIED",
    lifecycleState: "pipeline",
    createdAt: now,
    localCreatedAt: now,
    isLocalOnly: true,
    ingestionDetails,
  };
}

export function isPendingControlStressHandoff(threat: PipelineThreat): boolean {
  if (!threat.isLocalOnly) return false;
  return isControlStressTestIngestion(threat.ingestionDetails ?? null);
}

/** Merge optimistic vault handoff cards ahead of DB rows until the server fetch includes them. */
export function mergePipelineWithPendingControlStressHandoffs(
  fromDb: PipelineThreat[],
  existing: PipelineThreat[],
): PipelineThreat[] {
  const dbIds = new Set(fromDb.map((t) => t.id));
  const pending = existing.filter((t) => isPendingControlStressHandoff(t) && !dbIds.has(t.id));
  if (pending.length === 0) return fromDb;
  const seen = new Set<string>();
  const out: PipelineThreat[] = [];
  for (const row of [...pending, ...fromDb]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

export function writeControlStressHandoffSession(payload: ControlStressHandoffPayload): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function readControlStressHandoffSession(): ControlStressHandoffPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ControlStressHandoffPayload;
    if (!parsed?.threatId?.trim() || !parsed?.controlId?.trim()) return null;
    return {
      threatId: parsed.threatId.trim(),
      controlId: parsed.controlId.trim(),
      createdAt: parsed.createdAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function clearControlStressHandoffSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/** Stage optimistic Attack Velocity card + session backup for Command Post navigation. */
export function stageControlStressPipelineHandoff(controlId: string, threatId: string): PipelineThreat {
  const threat = buildOptimisticControlStressPipelineThreat(controlId, threatId);
  writeControlStressHandoffSession({
    threatId: threat.id,
    controlId: controlId.trim(),
    createdAt: threat.createdAt ?? new Date().toISOString(),
  });
  return threat;
}
