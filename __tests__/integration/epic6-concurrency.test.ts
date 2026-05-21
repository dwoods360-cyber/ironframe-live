import { describe, it, expect, beforeEach } from "vitest";
import { IronguardEnforcer } from "@/agents/ironguard";
import { db, resetLangGraphCheckpointStore } from "@/infrastructure/db";

const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());

const RISK_ID = "risk_race_003";
const TENANT_ID = "tenant_gridcore_4M";

describe("Epic 6 / 15: DB Transaction Isolation (Postgres checkpointer)", () => {
  beforeEach(async () => {
    if (!hasDatabase) return;
    await resetLangGraphCheckpointStore({ id: RISK_ID, tenant_id: TENANT_ID });
  });

  it.skipIf(!hasDatabase)(
    "Handles concurrent checkpoint writes using strict serialization",
    async () => {
      await db.langGraphCheckpoints.create({
        data: { id: RISK_ID, tenant_id: TENANT_ID, version: 1, status: "PROCESSING" },
      });

      const agent1Update = IronguardEnforcer.safeUpdateCheckpoint(RISK_ID, TENANT_ID, {
        version: 1,
        payload: { agent: "Ironscribe", complete: true },
      });

      const agent2Update = IronguardEnforcer.safeUpdateCheckpoint(RISK_ID, TENANT_ID, {
        version: 1,
        payload: { agent: "Irontrust", complete: true },
      });

      const results = await Promise.allSettled([agent1Update, agent2Update]);

      const successes = results.filter((r) => r.status === "fulfilled");
      const failures = results.filter((r) => r.status === "rejected");

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);

      if (failures[0].status === "rejected") {
        expect((failures[0].reason as Error).message).toContain(
          "TAS_VIOLATION: Concurrent state mutation detected",
        );
      }

      const finalRow = await db.langGraphCheckpoints.findUnique({
        where: { id: RISK_ID, tenant_id: TENANT_ID },
      });
      expect(finalRow?.version).toBe(2);
    },
    30_000,
  );
});
