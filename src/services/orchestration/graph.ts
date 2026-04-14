import { StateGraph, END } from "@langchain/langgraph";
import { SovereignGraphState } from "./state";
import { irongateIngestion, ironbloom, ironcore, ironlock, ironquery, irontrust, threatLifecycle } from "./nodes";
import { IronTech } from "./checkpointer";

export async function createSovereignGraph() {
  const workflow = new StateGraph(SovereignGraphState)
    .addNode("irongate", irongateIngestion)
    .addNode("ironcore", ironcore)
    .addNode("threatLifecycle", threatLifecycle)
    .addNode("ironbloom", ironbloom)
    .addNode("irontrust", irontrust)
    .addNode("ironquery", ironquery)
    .addNode("ironlock", ironlock)

    .addEdge("__start__", "irongate")
    .addEdge("irongate", "ironcore");

  // Multi-Node Conditional Routing (AI + deterministic safe fallback)
  workflow.addConditionalEdges(
    "ironcore",
    (state: typeof SovereignGraphState.State) => state.current_agent,
    {
      THREAT_LIFECYCLE: "threatLifecycle",
      IRONBLOOM: "ironbloom",
      IRONTRUST: "irontrust",
      IRONQUERY: "ironquery",
      IRONLOCK: "ironlock",
      END,
    }
  );

  // Multi-intent specialist loop: return to Ironcore until no work remains.
  workflow.addEdge("threatLifecycle", END);
  workflow.addEdge("ironbloom", "ironcore");
  workflow.addEdge("irontrust", "ironcore");
  workflow.addEdge("ironquery", END);
  workflow.addEdge("ironlock", END);

  const checkpointer = await IronTech.getCheckpointer();
  return workflow.compile({ checkpointer });
}

const graphPromise = createSovereignGraph();
export const graph = {
  invoke: async (...args: Parameters<Awaited<typeof graphPromise>["invoke"]>) => {
    const compiled = await graphPromise;
    return compiled.invoke(...args);
  },
  getState: async (...args: Parameters<Awaited<typeof graphPromise>["getState"]>) => {
    const compiled = await graphPromise;
    return compiled.getState(...args);
  },
};
