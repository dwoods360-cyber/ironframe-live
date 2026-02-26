import { StateGraph, END } from "@langchain/langgraph";
import { SovereignGraphState } from "./state";
import { IronCore } from "../agents/ironcore";
import { IronScribe } from "../agents/ironscribe";
import { IronTrust } from "../agents/irontrust";
import { IronTech } from "./checkpointer";

export async function createSovereignGraph() {
  const workflow = new StateGraph(SovereignGraphState)
    .addNode("ironcore", IronCore.route)
    .addNode("ironscribe", IronScribe.extract)
    .addNode("irontrust", IronTrust.analyzeRisk)

    .addEdge("__start__", "ironcore");

  // Multi-Node Conditional Routing
  workflow.addConditionalEdges(
    "ironcore",
    (state) => state.current_agent,
    {
      "IRONSCRIBE": "ironscribe",
      "IRONTRUST": "irontrust",
      "IRONGATE": "ironcore", // Loop back for re-sanitization if needed
      "END": END
    }
  );

  // Sequential Specialist Edges
  workflow.addEdge("ironscribe", "irontrust");
  workflow.addEdge("irontrust", END);

  const checkpointer = await IronTech.getCheckpointer();
  return workflow.compile({ checkpointer });
}
