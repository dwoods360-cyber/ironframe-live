import { getSovereignCheckpointChannelValues } from "@/src/services/orchestration/checkpointer";

export type ResumedOrchestratorState = {
  status: string;
  step: string;
  ale_impact: bigint;
};

/**
 * Ironcore — resume LangGraph thread from Postgres checkpoint (Epic 15).
 */
export const IroncoreOrchestrator = {
  async resumeFromCheckpoint(riskId: string, tenantId: string): Promise<ResumedOrchestratorState> {
    const values = await getSovereignCheckpointChannelValues(riskId, tenantId);
    if (!values) {
      throw new Error(`IroncoreOrchestrator: no checkpoint for risk=${riskId} tenant=${tenantId}`);
    }

    const status =
      typeof values.status === "string" && values.status.trim()
        ? values.status
        : "PROCESSING";
    const step =
      typeof values.current_agent === "string" && values.current_agent.trim()
        ? values.current_agent
        : "";

    const aleRaw =
      values.mitigated_value_cents ??
      values.financial_ale_cents ??
      values.sustainability_ale_cents ??
      "0";
    const ale_impact = BigInt(String(aleRaw));

    return { status, step, ale_impact };
  },
};
