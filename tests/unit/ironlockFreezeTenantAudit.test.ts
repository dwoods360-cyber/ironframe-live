import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  bind: vi.fn(),
  createAudit: vi.fn(),
  updateConfig: vi.fn(),
  privileged: {
    systemConfig: {
      findUnique: vi.fn(async () => ({
        stateFreezeActive: false,
        sustainabilityLiveApiDegraded: false,
      })),
      update: vi.fn(),
    },
    tenant: {
      findMany: vi.fn(async () => [
        { id: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01" },
        { id: "6d53106b-9f20-4ccf-a53e-8f9ee5cc7b02" },
      ]),
    },
    ironguardViolation: {
      count: vi.fn(async () => 4),
    },
  },
}));

vi.mock("@/lib/prismaPrivileged", () => ({
  getPrismaPrivileged: vi.fn(() => mocks.privileged),
}));

vi.mock("@/app/lib/server/ironguardSessionTenant", () => ({
  withIronguardTenant: mocks.bind.mockImplementation(
    async (_tenantId: string, run: (tx: object) => Promise<unknown>) => run({}),
  ),
}));

vi.mock("@/lib/auditLogLoose", () => ({
  auditLogCreateLooseTx: mocks.createAudit,
}));

vi.mock("@/lib/structuredServerLog", () => ({
  logStructuredEvent: vi.fn(),
}));

describe("Ironlock global freeze tenant audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.IRONFRAME_DEV_DIAGNOSTIC_WEBHOOK_URL;
  });

  it("writes one explicitly bound audit row for every tenant", async () => {
    const { initiateStateFreeze } = await import("@/src/services/ironlock/freezeEngine");

    await expect(initiateStateFreeze("test threshold exceeded")).resolves.toEqual({
      ok: true,
      alreadyActive: false,
    });

    expect(mocks.bind).toHaveBeenNthCalledWith(
      1,
      "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
      expect.any(Function),
    );
    expect(mocks.bind).toHaveBeenNthCalledWith(
      2,
      "6d53106b-9f20-4ccf-a53e-8f9ee5cc7b02",
      expect.any(Function),
    );
    expect(mocks.createAudit).toHaveBeenCalledTimes(2);
    expect(mocks.createAudit.mock.calls.map(([, args]) => args.data.governance_tenant_uuid)).toEqual([
      "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
      "6d53106b-9f20-4ccf-a53e-8f9ee5cc7b02",
    ]);
  });
});
