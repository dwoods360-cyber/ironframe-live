import { SovereignGraphState } from '../orchestration/state';

export class IronCore {
  /**
   * ROUTING LOGIC: Analyzes the payload and directs traffic.
   * Note: This is a pure logic node, no LLM call required for basic routing.
   */
  static async route(state: typeof SovereignGraphState.State): Promise<Partial<typeof SovereignGraphState.State>> {
    const type = state.raw_payload?.type;
    let nextStep = "END"; // Default to termination

    if (type === "FINANCIAL_AUDIT") {
      nextStep = "IRONTRUST"; // Agent 3
    } else if (type === "DOCUMENT_ANALYSIS") {
      nextStep = "IRONSCRIBE"; // Agent 5
    } else {
      nextStep = "IRONGATE"; // Agent 14 (Sanitization)
    }

    return {
      current_agent: nextStep,
      agent_logs: [`Ironcore routed payload type [${type}] to ${nextStep}`],
      status: "PROCESSING"
    };
  }
}
