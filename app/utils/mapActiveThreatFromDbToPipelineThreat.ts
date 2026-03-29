import type { PipelineThreat } from "@/app/store/riskStore";
import type { PipelineThreatFromDb } from "@/app/actions/simulationActions";

/** Client-safe: map `fetchActiveThreatsFromDb` rows to `PipelineThreat` (Ironsight / GRC JSON on `ingestionDetails`). */
export function mapActiveThreatFromDbToPipelineThreat(r: PipelineThreatFromDb): PipelineThreat {
  return {
    id: r.id,
    name: r.name,
    loss: r.loss,
    score: r.score,
    industry: r.industry,
    source: r.source,
    description: r.description,
    aiReport: r.aiReport ?? undefined,
    lifecycleState: "active",
    workNotes: r.workNotes ?? [],
    assignmentHistory: r.assignmentHistory ?? [],
    assignedTo: r.assignedTo,
    createdAt: r.createdAt,
    ttlSeconds: r.ttlSeconds ?? undefined,
    ingestionDetails: r.ingestionDetails ?? undefined,
  };
}
