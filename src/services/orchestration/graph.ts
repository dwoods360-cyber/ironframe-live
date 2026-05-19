/**
 * Irontech / structural repair (Section 4.3): consume shadow-plane `SimulationDiagnosticLog` rows where
 * `action === "OPERATIONAL_DEFICIENCY_REPORT"`; payload `snapshot.ingestionDetailsFull` is the full ingestion blob.
 *
 * Agent 9 (Ironmap) — decoupling: **Ironcore** may emit **partial state transitions** (e.g. IRONTRUST) when
 * live carbon feeds are degraded; see `IronCore.route` + `ironmap/criticalPath.ts`.
 */
import { StateGraph, END } from "@langchain/langgraph";
import { SovereignGraphState } from "./state";
import { IronCore } from "../agents/ironcore";
import { IronScribe } from "../agents/ironscribe";
import { IronTrust } from "../agents/irontrust";
import { TheWarden } from "../agents/warden";
import { IronTech } from "./checkpointer";
import { Ironbloom } from "../agents/ironbloom";
import {
  getIronlockGovernanceDelayMsForTenantSync,
  IRONLOCK_AUTO_THROTTLE_NOTIFICATION,
} from "../agents/ironlock/throttlingEngine";

type GraphState = typeof SovereignGraphState.State;

async function ironlockGovernanceDelayIfThrottled(
  tenantId: string,
  agentKey: string,
): Promise<{ delayMs: number; logs: string[] }> {
  const delayMs = getIronlockGovernanceDelayMsForTenantSync(tenantId);
  if (delayMs <= 0) return { delayMs: 0, logs: [] };
  await new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
  return {
    delayMs,
    logs: [
      IRONLOCK_AUTO_THROTTLE_NOTIFICATION,
      `SIG_THROTTLE:${agentKey}:governance_delay_ms=${delayMs}`,
    ],
  };
}

/** Non-critical background chain: Ironsight → Ironquery → Irontally (Agent 6 may insert governance_delay). */
const ironsightThrottled = async (state: GraphState) => {
  const { logs } = await ironlockGovernanceDelayIfThrottled(state.tenant_id, "ironsight");
  return logs.length ? { agent_logs: logs } : {};
};

const ironqueryThrottled = async (state: GraphState) => {
  const { logs } = await ironlockGovernanceDelayIfThrottled(state.tenant_id, "ironquery");
  return logs.length ? { agent_logs: logs } : {};
};

const irontallyThrottled = async (state: GraphState) => {
  const { logs } = await ironlockGovernanceDelayIfThrottled(state.tenant_id, "irontally");
  return logs.length ? { agent_logs: logs } : {};
};

/** Sprint placeholder nodes: registered now; throttling hooks on background chain. */
const passThroughIronsight = async (state: GraphState) => {
  const idle = await ironsightThrottled(state);
  return { ...idle };
};
const passThroughIronquery = async (state: GraphState) => {
  const idle = await ironqueryThrottled(state);
  return { ...idle };
};
const passThroughIrontally = async (state: GraphState) => {
  const idle = await irontallyThrottled(state);
  return { ...idle };
};

export async function createSovereignGraph() {
  const workflow = new StateGraph(SovereignGraphState)
    .addNode("ironcore", IronCore.route)
    .addNode("ironbloom", Ironbloom.scoreCarbonRisk)
    .addNode("ironscribe", IronScribe.extract)
    .addNode("warden", TheWarden.validate)
    .addNode("irontrust", IronTrust.analyzeRisk)
    .addNode("ironsight", passThroughIronsight)
    .addNode("ironquery", passThroughIronquery)
    .addNode("irontally", passThroughIrontally)

    .addEdge("__start__", "ironcore");

  // Multi-Node Conditional Routing
  workflow.addConditionalEdges(
    "ironcore",
    (state) => state.current_agent,
    {
      IRONSCRIBE: "ironscribe",
      IRONTRUST: "irontrust",
      IRONBLOOM: "ironbloom",
      IRONGATE: "ironcore", // Loop back for re-sanitization if needed
      END: END,
    },
  );

  workflow.addEdge("ironbloom", "irontrust");

  // Sequential Specialist Edges (new placeholders are registered in-chain for future wiring)
  workflow.addEdge("ironscribe", "warden");
  workflow.addEdge("warden", "irontrust");
  workflow.addEdge("irontrust", "ironsight");
  workflow.addEdge("ironsight", "ironquery");
  workflow.addEdge("ironquery", "irontally");
  workflow.addEdge("irontally", END);

  const checkpointer = await IronTech.getCheckpointer();
  return workflow.compile({ checkpointer });
}
