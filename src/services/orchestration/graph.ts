/**
 * Irontech / structural repair (Section 4.3): consume shadow-plane `SimulationDiagnosticLog` rows where
 * `action === "OPERATIONAL_DEFICIENCY_REPORT"`; payload `snapshot.ingestionDetailsFull` is the full ingestion blob.
 */
import { StateGraph, END } from "@langchain/langgraph";
import { SovereignGraphState } from "./state";
import { IronCore } from "../agents/ironcore";
import { IronScribe } from "../agents/ironscribe";
import { IronTrust } from "../agents/irontrust";
import { TheWarden } from "../agents/warden";
import { IronTech } from "./checkpointer";

/** Sprint placeholder nodes: registered now, wired with real logic next sprint. */
const passThroughIronsight = (state: any) => state;
const passThroughIronquery = (state: any) => state;
const passThroughIrontally = (state: any) => state;

export async function createSovereignGraph() {
  const workflow = new StateGraph(SovereignGraphState)
    .addNode("ironcore", IronCore.route)
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
      "IRONSCRIBE": "ironscribe",
      "IRONTRUST": "irontrust",
      "IRONGATE": "ironcore", // Loop back for re-sanitization if needed
      "END": END
    }
  );

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
