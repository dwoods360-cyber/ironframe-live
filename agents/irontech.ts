import { db } from "@/infrastructure/db";

/** Serializable slice of Irontech / LangGraph thread state (integer cents only for ALE). */
export type IrontechFrozenPayload = {
  status: string;
  step: string;
  ale_impact: bigint;
};

/**
 * Irontech — freeze orchestration state on stream disconnect (Epic 6).
 */
export const IrontechHealer = {
  async freezeState(riskId: string, tenantId: string, state: IrontechFrozenPayload): Promise<void> {
    await db.langGraphCheckpoints.upsert({
      where: { id: riskId, tenant_id: tenantId },
      create: {
        id: riskId,
        tenant_id: tenantId,
        persisted_state: state.status,
        status: state.status,
        step: state.step,
        ale_impact: state.ale_impact.toString(),
        version: 1,
        payload: {},
      },
      update: {
        persisted_state: state.status,
        step: state.step,
        ale_impact: state.ale_impact.toString(),
      },
    });
  },
};
