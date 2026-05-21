/**
 * Legacy main-branch Postgres checkpointer — disabled until `AgentGraphState` lands in Prisma.
 * Active path: `getPostgresCheckpointer()` in `src/services/orchestration/checkpointer.ts`.
 */

export type PrismaCheckpointerStub = {
  disabled: true;
  reason: string;
};

export function createPrismaCheckpointer(): PrismaCheckpointerStub {
  return {
    disabled: true,
    reason: "AgentGraphState model not in schema; use src/services/orchestration/checkpointer.ts",
  };
}
