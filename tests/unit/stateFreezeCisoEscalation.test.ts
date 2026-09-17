import { beforeEach, describe, expect, it, vi } from "vitest";

const TENANT_A = "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01";
const TENANT_B = "6d53106b-9f20-4ccf-a53e-8f9ee5cc7b02";

const mocks = vi.hoisted(() => ({
  bind: vi.fn(),
  createAudit: vi.fn(),
  dispatch: vi.fn(),
  privileged: {
    systemConfig: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    tenant: {
      findMany: vi.fn(async () => [{ id: TENANT_A }, { id: TENANT_B }]),
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

vi.mock("@/services/ironcast.service", () => ({
  IroncastService: { dispatch: mocks.dispatch },
}));

vi.mock("@/app/config/sustainabilityStaleLockdown", () => ({
  computeSustainabilityStaleLockdown: vi.fn(() => ({ blockingMutations: true })),
}));

vi.mock("@/app/services/governanceScoring", () => ({
  recalculateSystemMaturityScore: vi.fn(),
}));

describe("Ironcast state-freeze escalation tenant audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.privileged.systemConfig.findUnique.mockResolvedValue({
      sustainabilityLiveApiDegraded: true,
      sustainabilityApiDegradedSince: new Date("2026-09-16T00:00:00.000Z"),
      sustainabilityStaleLockdownWaived: false,
      stateFreezeEscalatedAt: null,
      adminAlertEmail: "ciso@example.test",
    });
    mocks.privileged.systemConfig.updateMany.mockResolvedValue({ count: 1 });
    mocks.privileged.tenant.findMany.mockResolvedValue([{ id: TENANT_A }, { id: TENANT_B }]);
  });

  it("writes one bound forensic row for every catalog tenant", async () => {
    const { ensureStateFreezeCisoEscalation } = await import(
      "@/src/services/ironcast/stateFreezeCisoEscalation"
    );

    await ensureStateFreezeCisoEscalation();

    expect(mocks.bind).toHaveBeenNthCalledWith(1, TENANT_A, expect.any(Function));
    expect(mocks.bind).toHaveBeenNthCalledWith(2, TENANT_B, expect.any(Function));
    expect(mocks.createAudit).toHaveBeenCalledTimes(2);
    expect(mocks.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: TENANT_A }),
    );
  });
});
