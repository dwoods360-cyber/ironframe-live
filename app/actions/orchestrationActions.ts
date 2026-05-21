"use server";

/**
 * Epic 10 workforce snapshot — disabled pending Prisma `AgentGraphState` model.
 * Sovereign bus: `compileSovereignOrchestrationBus` in `src/services/orchestration/graph.ts`.
 */

export type WorkforceStateSnapshot = {
  threadId: string;
  tenantId: string;
  updatedAt: string;
  state: Record<string, unknown>;
};

export async function getWorkforceState(_threadId: string): Promise<WorkforceStateSnapshot | null> {
  return null;
}
