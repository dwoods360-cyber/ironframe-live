import { END, StateGraph } from "@langchain/langgraph";

import { BoardStateAnnotation } from "./state.js";
import {
  agentCEO,
  agentCFO,
  agentCompliance,
  agentLegal,
} from "./agents/founding.js";
import { agentTechnicalWriter, agentUserTrainer } from "./agents/knowledge.js";

/**
 * Ironboard executive LangGraph — CEO → CFO → Compliance → Legal → Trainer → Writer.
 * Untethered from ironframe-live SaaS transaction database.
 */
export const corporateBoardGraph = new StateGraph(BoardStateAnnotation)
  .addNode("ceo", agentCEO)
  .addNode("cfo", agentCFO)
  .addNode("compliance", agentCompliance)
  .addNode("legal", agentLegal)
  .addNode("trainer", agentUserTrainer)
  .addNode("writer", agentTechnicalWriter)
  .addEdge("__start__", "ceo")
  .addEdge("ceo", "cfo")
  .addEdge("cfo", "compliance")
  .addEdge("compliance", "legal")
  .addEdge("legal", "trainer")
  .addEdge("trainer", "writer")
  .addEdge("writer", END)
  .compile();

export async function runExecutiveDocumentationCommand(): Promise<void> {
  const { executeSequentialDocumentationLoop } = await import("./automation/chapterLoop.js");
  console.log(
    "[EXEC COMMAND] Tripane anchors: left=w-[22vw] center=w-[48vw] right=w-[30vw] highlight=select-text",
  );
  await executeSequentialDocumentationLoop();
}
