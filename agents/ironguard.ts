import { db } from "@/infrastructure/db";

export type SafeCheckpointPayload = {
  version: number;
  payload: Record<string, unknown>;
};

/**
 * Ironguard — serialized checkpoint updates with optimistic versioning (Epic 6).
 */
export const IronguardEnforcer = {
  async safeUpdateCheckpoint(
    riskId: string,
    tenantId: string,
    update: SafeCheckpointPayload,
  ): Promise<void> {
    await db.withSerializedCheckpoint(riskId, tenantId, async () => {
      const row = await db.langGraphCheckpoints.findUnique({
        where: { id: riskId, tenant_id: tenantId },
      });
      if (!row) {
        throw new Error("IronguardEnforcer: checkpoint not found");
      }
      if (row.version !== update.version) {
        throw new Error("TAS_VIOLATION: Concurrent state mutation detected");
      }
      const agentKey =
        typeof update.payload.agent === "string" && update.payload.agent.trim()
          ? update.payload.agent.trim()
          : "_agent";
      const nextPayload = { ...row.payload, [agentKey]: update.payload };
      await db.langGraphCheckpoints._replace({
        ...row,
        version: row.version + 1,
        payload: nextPayload,
      });
    });
  },
};
