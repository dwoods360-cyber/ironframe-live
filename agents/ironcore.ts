import { db } from "@/infrastructure/db";

export type ResumedOrchestratorState = {
  status: string;
  step: string;
  ale_impact: bigint;
};

/**
 * Ironcore — resume LangGraph thread from persisted checkpoint after reconnect (Epic 6).
 */
export const IroncoreOrchestrator = {
  async resumeFromCheckpoint(riskId: string, tenantId: string): Promise<ResumedOrchestratorState> {
    const row = await db.langGraphCheckpoints.findUnique({
      where: { id: riskId, tenant_id: tenantId },
    });
    if (!row) {
      throw new Error(`IroncoreOrchestrator: no checkpoint for risk=${riskId} tenant=${tenantId}`);
    }
    return {
      status: row.persisted_state,
      step: row.step,
      ale_impact: BigInt(row.ale_impact),
    };
  },
};
