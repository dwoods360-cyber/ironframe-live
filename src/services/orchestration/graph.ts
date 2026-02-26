import { StateGraph, END } from "@langchain/langgraph";
import { SovereignGraphState } from "./state";
import { IronCore } from "../agents/ironcore";
import { IronTech } from "./checkpointer";

/**
 * SOVEREIGN ORCHESTRATION GRAPH
 * Mandate: Every transition is checkpointed by Agent 11 (Irontech).
 */
export async function createSovereignGraph() {
  // 1. Initialize the Graph with our State DNA
  const workflow = new StateGraph(SovereignGraphState)
    // 2. Add the Orchestrator Node (Agent 1)
    .addNode("ironcore", IronCore.route)

    // 3. Define the Starting Point
    .addEdge("__start__", "ironcore");

  // 4. Define Routing (If Ironcore says END or routes to another agent, stop. Else loop.)
  workflow.addConditionalEdges(
    "ironcore",
    (state) => (state.current_agent === "END" || state.current_agent !== "ironcore") ? "end" : "ironcore",
    {
      "end": END,
      "ironcore": "ironcore" // Recursive loop for multi-step routing
    }
  );

  // 5. Connect the Agent 11 Checkpointer for Self-Healing
  const checkpointer = await IronTech.getCheckpointer();

  // 6. Finalize the Graph
  return workflow.compile({ checkpointer });
}
