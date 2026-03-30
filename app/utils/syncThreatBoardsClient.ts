import { fetchActiveThreatsFromDb, fetchPipelineThreatsFromDb } from "@/app/actions/simulationActions";
import { mapActiveThreatFromDbToPipelineThreat } from "@/app/utils/mapActiveThreatFromDbToPipelineThreat";
import { useAgentStore } from "@/app/store/agentStore";
import { useRiskStore } from "@/app/store/riskStore";
import type { PipelineThreat } from "@/app/store/riskStore";

/** Refetch pipeline + active ThreatEvents from the server and push into the risk store (client). */
export async function syncThreatBoardsClient(
  replacePipelineThreats?: (threats: PipelineThreat[]) => void,
  replaceActiveThreats?: (threats: PipelineThreat[]) => void,
): Promise<void> {
  const [pipeRows, activeRows] = await Promise.all([
    fetchPipelineThreatsFromDb(),
    fetchActiveThreatsFromDb(),
  ]);

  const asPipeline: PipelineThreat[] = pipeRows.map((r) => ({
    id: r.id,
    name: r.name,
    loss: r.loss,
    score: r.score,
    industry: r.industry,
    source: r.source,
    description: r.description,
    createdAt: r.createdAt,
  }));

  const asActiveFromDb: PipelineThreat[] = activeRows.map(mapActiveThreatFromDbToPipelineThreat);
  const optimistic = useAgentStore.getState().activeThreats ?? [];
  const withOptimistic: PipelineThreat[] = [
    ...asActiveFromDb,
    ...optimistic.filter((t) => !asActiveFromDb.some((db) => db.id === t.id)),
  ];
  const asActive = useAgentStore.getState().setInitialThreats(withOptimistic);

  const rp = replacePipelineThreats ?? useRiskStore.getState().replacePipelineThreats;
  const ra = replaceActiveThreats ?? useRiskStore.getState().replaceActiveThreats;
  rp(asPipeline);
  ra(asActive);
}
