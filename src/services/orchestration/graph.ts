import { StateGraph, END } from "@langchain/langgraph";
import { SovereignGraphState } from "./state";
import { IronCore } from "../agents/ironcore";
import { IronScribe } from "../agents/ironscribe";
import { IronTrust } from "../agents/irontrust";
import { TheWarden } from "../agents/warden";
import { IronTech } from "./checkpointer";

export async function createSovereignGraph() {
  const workflow = new StateGraph(SovereignGraphState)
    .addNode("ironcore", IronCore.route)
    .addNode("ironscribe", IronScribe.extract)
    .addNode("warden", TheWarden.validate)
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

  // Sequential Specialist Edges (Warden validates LLM output before Irontrust)
  workflow.addEdge("ironscribe", "warden");
  workflow.addEdge("warden", "irontrust");
  workflow.addEdge("irontrust", END);

  const checkpointer = await IronTech.getCheckpointer();
  return workflow.compile({ checkpointer });
}
