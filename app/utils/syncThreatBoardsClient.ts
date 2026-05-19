import { fetchPipelineThreatsFromDb } from "@/app/actions/simulationActions";
import { useAgentStore } from "@/app/store/agentStore";
import { useRiskStore } from "@/app/store/riskStore";
import type { PipelineThreat } from "@/app/store/riskStore";
import {
  endActiveThreatsBoardFetchIfCurrent,
  supersedeActiveThreatsBoardFetch,
} from "@/app/utils/activeThreatsBoardFetchCoop";
import { belongsOnAttackVelocityPipeline } from "@/app/utils/chaosDiscoveryHold";
import { isChaosForensicClosureLingerActive } from "@/app/utils/chaosForensicClosure";

/** Refetch pipeline + active ThreatEvents from the server and push into the risk store (client). */
export async function syncThreatBoardsClient(
  replacePipelineThreats?: (threats: PipelineThreat[]) => void,
  replaceActiveThreats?: (threats: PipelineThreat[]) => void,
): Promise<void> {
  await new Promise((r) => setTimeout(r, 800)); // 800ms settlement delay
  const activeUrl = "/api/threats/active";
  const activeCtrl = supersedeActiveThreatsBoardFetch();
  let pipeRows: Awaited<ReturnType<typeof fetchPipelineThreatsFromDb>>;
  let activeRows: PipelineThreat[];
  try {
    const [p, activeRes] = await Promise.all([
      fetchPipelineThreatsFromDb(),
      fetch(activeUrl, { cache: "no-store", signal: activeCtrl.signal }),
    ]);
    pipeRows = p;
    if (!activeRes.ok) {
      throw new Error(`GET ${activeUrl} failed: ${activeRes.status}`);
    }
    activeRows = (await activeRes.json()) as PipelineThreat[];
  } catch (e) {
    const aborted =
      (e instanceof DOMException && e.name === "AbortError") ||
      (e instanceof Error && e.name === "AbortError");
    if (aborted) return;
    throw e;
  } finally {
    endActiveThreatsBoardFetchIfCurrent(activeCtrl);
  }

  const asPipeline: PipelineThreat[] = pipeRows
    .map((r) => ({
      id: r.id,
      name: r.name,
      loss: r.loss,
      score: r.score,
      industry: r.industry,
      source: r.source,
      description: r.description,
      createdAt: r.createdAt,
      threatStatus: r.threatStatus,
      ingestionDetails: r.ingestionDetails ?? undefined,
      dispositionStatus: r.dispositionStatus,
      isFalsePositive: r.isFalsePositive,
      receiptHash: r.receiptHash,
      governanceHash: r.governanceHash,
    }))
    .filter((row) =>
      belongsOnAttackVelocityPipeline({
        threatStatus: row.threatStatus,
        ingestionDetails: row.ingestionDetails ?? null,
        industry: row.industry,
        createdAt: row.createdAt,
      }),
    );

  const freezeUntil = useRiskStore.getState().purgeBoardFreezeUntil;
  if (freezeUntil > 0 && Date.now() < freezeUntil) {
    const rp = replacePipelineThreats ?? useRiskStore.getState().replacePipelineThreats;
    const ra = replaceActiveThreats ?? useRiskStore.getState().replaceActiveThreats;
    rp(asPipeline);
    ra([]);
    return;
  }

  const asActiveFromDb: PipelineThreat[] = activeRows;
  const storeActive = useRiskStore.getState().activeThreats;
  const terminal = new Set(["RESOLVED", "CLOSED_ARCHIVED"]);
  const optimistic = useAgentStore.getState().activeThreats ?? [];
  const victoryLingerFromStore = storeActive.filter((t) => {
    if (asActiveFromDb.some((db) => db.id === t.id)) return false;
    return isChaosForensicClosureLingerActive(t.ingestionDetails ?? null);
  });
  const withOptimistic: PipelineThreat[] = [
    ...asActiveFromDb,
    ...victoryLingerFromStore,
    ...optimistic.filter((t) => {
      if (asActiveFromDb.some((db) => db.id === t.id)) return false;
      if (victoryLingerFromStore.some((v) => v.id === t.id)) return false;
      const st = (t.threatStatus ?? "").trim().toUpperCase();
      if (terminal.has(st)) return false;
      return true;
    }),
  ];
  const asActive = useAgentStore.getState().setInitialThreats(withOptimistic);

  const rp = replacePipelineThreats ?? useRiskStore.getState().replacePipelineThreats;
  const ra = replaceActiveThreats ?? useRiskStore.getState().replaceActiveThreats;
  rp(asPipeline);
  ra(asActive);
}
