import { executeSystemHalt } from "@/src/services/irontech/freezeEngine";

/** Serializable slice of Irontech / LangGraph thread state (integer cents only for ALE). */
export type IrontechFrozenPayload = {
  status: string;
  step: string;
  ale_impact: bigint;
};

/**
 * Irontech — freeze orchestration state on stream disconnect (Epic 15).
 * Persists via PostgresSaver + risk_registry (no in-memory checkpoint dictionary).
 */
export const IrontechHealer = {
  async freezeState(riskId: string, tenantId: string, _state: IrontechFrozenPayload): Promise<void> {
    await executeSystemHalt({ tenantId, threadId: riskId });
  },
};
