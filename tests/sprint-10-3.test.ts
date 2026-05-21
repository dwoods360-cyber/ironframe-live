import { describe, it, expect } from "vitest";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/prisma";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe("Sprint 10.3 linear workforce coordination", () => {
  it.skipIf(!hasDatabase)("routes mixed payload through Irontrust -> Ironbloom -> END and persists checkpoints", async () => {
    const { createSovereignGraph } = await import("../src/services/orchestration/graph");
    const graph = await createSovereignGraph();

    const tenantId = uuidv4();
    const threadId = `sprint-10-3-${uuidv4()}`;

    const initialState = {
      tenant_id: tenantId,
      raw_payload: {
        type: "MIXED_SIGNAL",
        text: "Purchase receipt: $5,000 for 2,000 Liters of industrial coolant.",
        mitigatedValueCents: "500000",
      },
      status: "PENDING" as const,
    };

    const config = {
      configurable: {
        thread_id: threadId,
        tenant_id: tenantId,
      },
    } as unknown as Parameters<typeof graph.invoke>[1];

    const result = await graph.invoke(initialState, config);
    const logs = result.agent_logs as string[];

    const trustIdx = logs.findIndex((l) => l.includes("routed to IRONTRUST"));
    const trustDoneIdx = logs.findIndex((l) => l.includes("[IRONTRUST]"));
    const bloomIdx = logs.findIndex((l) => l.includes("routed to IRONBLOOM"));
    const bloomDoneIdx = logs.findIndex((l) => l.includes("[IRONBLOOM]"));
    const endIdx = logs.findIndex((l) => l.includes("Returning END"));

    expect(trustIdx).toBeGreaterThanOrEqual(0);
    expect(trustDoneIdx).toBeGreaterThan(trustIdx);
    expect(bloomIdx).toBeGreaterThan(trustDoneIdx);
    expect(bloomDoneIdx).toBeGreaterThan(bloomIdx);
    expect(endIdx).toBeGreaterThan(bloomDoneIdx);

    expect(result.status).toBe("COMPLETED");
    expect(result.processed_agents).toEqual(expect.arrayContaining(["IRONTRUST", "IRONBLOOM"]));

    const persisted = await prisma.agentGraphState.findUnique({
      where: { threadId },
      select: { state: true },
    });

    expect(persisted).not.toBeNull();

    const stateEnvelope = persisted?.state as
      | {
          checkpoint?: {
            channel_values?: {
              agent_logs?: string[];
              processed_agents?: string[];
            };
          };
        }
      | undefined;

    const persistedLogs = stateEnvelope?.checkpoint?.channel_values?.agent_logs ?? [];
    const persistedProcessed = stateEnvelope?.checkpoint?.channel_values?.processed_agents ?? [];

    expect(persistedLogs.some((l) => l.includes("routed to IRONTRUST"))).toBe(true);
    expect(persistedLogs.some((l) => l.includes("[IRONTRUST]"))).toBe(true);
    expect(persistedLogs.some((l) => l.includes("routed to IRONBLOOM"))).toBe(true);
    expect(persistedLogs.some((l) => l.includes("[IRONBLOOM]"))).toBe(true);
    expect(persistedLogs.some((l) => l.includes("Returning END"))).toBe(true);
    expect(persistedProcessed).toEqual(expect.arrayContaining(["IRONTRUST", "IRONBLOOM"]));
  });
});

