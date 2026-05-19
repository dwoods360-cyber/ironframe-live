import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { v4 as uuidv4 } from "uuid";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import { persistForensicState } from "@/app/lib/riskRegistryDb";

vi.mock("@/app/lib/riskRegistryDb", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/app/lib/riskRegistryDb")>();
  return {
    ...mod,
    persistForensicState: vi.fn().mockResolvedValue(null),
  };
});

describe("Forensic orchestration graph (Epic 10.2/10.3)", () => {
  const priorMapsKey = process.env.ELECTRICITY_MAPS_API_KEY;

  beforeEach(() => {
    delete process.env.ELECTRICITY_MAPS_API_KEY;
  });

  afterEach(() => {
    if (priorMapsKey === undefined) {
      delete process.env.ELECTRICITY_MAPS_API_KEY;
    } else {
      process.env.ELECTRICITY_MAPS_API_KEY = priorMapsKey;
    }
  });

  it(
    "routes carbon payloads through ironbloom → irontrust",
    async () => {
    const { compileOrchestrationGraph } = await import(
      "../src/services/orchestration/forensicPipelineGraph"
    );
    const graph = compileOrchestrationGraph();
    const tenantId = TENANT_UUIDS.gridcore;

    const result = await graph.invoke({
      threatId: uuidv4(),
      tenantId,
      rawPayload: {
        tenant_id: tenantId,
        source_type: "API",
        raw_data: { kwh: 1200, asset_id: "SOLAR_ARRAY_A" },
      },
      historyLogs: [],
    });

    expect(result.tenantId).toBe(tenantId);
    expect(result.currentAssignee).toBeNull();
    expect(BigInt(result.financialImpactCents)).toBeGreaterThan(0n);
    expect(
      result.historyLogs.some((e) => e.agentId.includes("Ironbloom")),
    ).toBe(true);
    expect(
      result.historyLogs.some((e) => e.message.includes("Irontrust")),
    ).toBe(true);

    expect(vi.mocked(persistForensicState)).toHaveBeenCalledWith(
      expect.objectContaining({
        rawAuditMarkdown: expect.stringContaining("FORENSIC AUDIT TRAIL"),
      }),
    );
    },
    15_000,
  );

  it("irongate rejects payloads without tenant stamp", async () => {
    const { compileOrchestrationGraph } = await import(
      "../src/services/orchestration/forensicPipelineGraph"
    );
    const graph = compileOrchestrationGraph();

    await expect(
      graph.invoke({
        threatId: uuidv4(),
        tenantId: "",
        rawPayload: { kwh: 10 },
        historyLogs: [],
      }),
    ).rejects.toThrow(/Missing Tenant Stamp/i);
  });
});
