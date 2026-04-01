import { fetchPipelineThreatsFromDb } from "@/app/actions/simulationActions";
import { useAgentStore } from "@/app/store/agentStore";
import { useRiskStore } from "@/app/store/riskStore";
import type { PipelineThreat } from "@/app/store/riskStore";

/** Refetch pipeline + active ThreatEvents from the server and push into the risk store (client). */
export async function syncThreatBoardsClient(
  replacePipelineThreats?: (threats: PipelineThreat[]) => void,
  replaceActiveThreats?: (threats: PipelineThreat[]) => void,
): Promise<void> {
  await new Promise((r) => setTimeout(r, 800)); // 800ms settlement delay
  const activeUrl = "/api/threats/active";
  const [pipeRows, activeRes] = await Promise.all([
    fetchPipelineThreatsFromDb(),
    fetch(activeUrl, { cache: "no-store" }),
  ]);
  if (!activeRes.ok) {
    throw new Error(`GET ${activeUrl} failed: ${activeRes.status}`);
  }
  const activeRows = (await activeRes.json()) as PipelineThreat[];

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

  const asActiveFromDb: PipelineThreat[] = activeRows;
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
