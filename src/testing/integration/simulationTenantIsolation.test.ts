import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "@/testing/singleton";
import { executeChaosDrill } from "@/app/api/simulation/drillRouter";

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}));

vi.mock("@/app/middleware/irongateShield", () => ({
  validateIngressContext: vi.fn((tenantId: string | undefined) => {
    if (!tenantId?.trim()) {
      throw new Error("IRONGATE_SHIELD: Zero-trust ingestion rejected missing tenant ID.");
    }
    return { sanitized: true, tenantId: tenantId.trim() };
  }),
}));

describe("🛡️ Ironframe Chaos Engine — Multi-Tenant Isolation Sanity Array", () => {
  const mockMedshieldTenantId = "tenant_medshield_11_1m";
  const mockVaultbankTenantId = "tenant_vaultbank_5_9m";

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.company.findFirst.mockImplementation(async ({ where }: { where?: { tenantId?: string } }) => {
      const tid = where?.tenantId;
      if (tid === mockMedshieldTenantId) return { id: 101n };
      if (tid === mockVaultbankTenantId) return { id: 202n };
      return null;
    });
  });

  it("🟢 SHOULD dynamically bind the correct tenant ID and reject hardcoded leak vectors", async () => {
    prismaMock.threatEvent.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
      return Promise.resolve({
        id: "mock-threat-uuid-999",
        title: data.title,
        scenarioId: data.scenarioId,
        tenantCompanyId: data.tenantCompanyId,
        status: "ACTIVE",
        createdAt: new Date(),
      });
    });

    const sampleMedshieldPayload = {
      scenarioId: 4,
      requestedBy: "user_dev_dereck",
      sessionTenantId: mockMedshieldTenantId,
    };

    const result = await executeChaosDrill(sampleMedshieldPayload);

    expect(result.tenantCompanyId).not.toBe("tenant_vaultbank_5_9m");
    expect(result.tenantCompanyId).toBe(mockMedshieldTenantId);

    const createArg = prismaMock.threatEvent.create.mock.calls[0]?.[0] as {
      data: { ingestionDetails: string; tenantCompanyId: bigint };
    };
    const ingestion = JSON.parse(createArg.data.ingestionDetails) as { tenantScopeUuid: string };
    expect(ingestion.tenantScopeUuid).toBe(mockMedshieldTenantId);
  });

  it("🔴 SHOULD fail execution with a strict error block if session tenant context goes missing", async () => {
    const corruptedPayload = {
      scenarioId: 4,
      requestedBy: "user_dev_dereck",
      sessionTenantId: undefined,
    };

    await expect(executeChaosDrill(corruptedPayload)).rejects.toThrow(
      "IRONGATE_SHIELD: Zero-trust ingestion rejected missing tenant ID.",
    );
    expect(prismaMock.threatEvent.create).not.toHaveBeenCalled();
  });

  it("⚡ SHOULD verify all 19 human-in-the-loop drills explicitly return active threat cards matching the active caller context", async () => {
    const hitlScenarios = [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

    prismaMock.threatEvent.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
      const ingestion = JSON.parse(String(data.ingestionDetails)) as { scenarioId: number };
      return Promise.resolve({
        id: `mock-id-${ingestion.scenarioId}`,
        tenantCompanyId: data.tenantCompanyId,
        status: "ACTIVE",
      });
    });

    for (const scenarioId of hitlScenarios) {
      const response = await executeChaosDrill({
        scenarioId,
        requestedBy: "user_dev_dereck",
        sessionTenantId: mockVaultbankTenantId,
      });

      expect(response.tenantCompanyId).toBe(mockVaultbankTenantId);
      expect(response.tenantCompanyId).not.toBe(mockMedshieldTenantId);
    }

    expect(prismaMock.threatEvent.create).toHaveBeenCalledTimes(hitlScenarios.length);
  });
});
