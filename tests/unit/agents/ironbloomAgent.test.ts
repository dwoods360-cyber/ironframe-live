import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  createAuditLogMock: vi.fn(),
  createMetricMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/prismaAdmin", () => ({
  prismaAdmin: {
    $transaction: mocked.transactionMock,
  },
}));

import { processPhysicalEsgMetric } from "@/app/lib/agents/ironbloomAgent";

describe("ironbloomAgent BigInt conversion contracts", () => {
  beforeEach(() => {
    mocked.createAuditLogMock.mockReset();
    mocked.createMetricMock.mockReset();
    mocked.transactionMock.mockReset();
    mocked.transactionMock.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        botAuditLog: {
          create: mocked.createAuditLogMock,
        },
        ironbloomEsgMetric: {
          create: mocked.createMetricMock,
        },
      }),
    );
  });

  it("KWH: 100 * 385 = 38500 grams CO2e", async () => {
    mocked.createAuditLogMock.mockResolvedValue({ id: "audit-kwh-1" });
    mocked.createMetricMock.mockResolvedValue({
      id: "metric-kwh-1",
      unit: "KWH",
      quantity: 100n,
      carbonEquivalent: 38500n,
    });

    const result = await processPhysicalEsgMetric({
      unit: "KWH",
      quantity: 100,
      tenantId: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
    });

    expect(result.carbonEquivalent).toBe("38500");
    expect(result.quantity).toBe("100");
    expect(mocked.createMetricMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quantity: 100n,
          carbonEquivalent: 38500n,
        }),
      }),
    );
  });

  it("LITERS: 50 * 2310 = 115500 grams CO2e", async () => {
    mocked.createAuditLogMock.mockResolvedValue({ id: "audit-liters-1" });
    mocked.createMetricMock.mockResolvedValue({
      id: "metric-liters-1",
      unit: "LITERS",
      quantity: 50n,
      carbonEquivalent: 115500n,
    });

    const result = await processPhysicalEsgMetric({
      unit: "LITERS",
      quantity: "50",
      tenantId: "c6932d16-a716-4a07-9bc4-6ec987f641e2",
    });

    expect(result.carbonEquivalent).toBe("115500");
    expect(result.quantity).toBe("50");
    expect(mocked.createMetricMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quantity: 50n,
          carbonEquivalent: 115500n,
        }),
      }),
    );
  });

  it("KILOMETERS: 1000 * 120 = 120000 grams CO2e", async () => {
    mocked.createAuditLogMock.mockResolvedValue({ id: "audit-km-1" });
    mocked.createMetricMock.mockResolvedValue({
      id: "metric-km-1",
      unit: "KILOMETERS",
      quantity: 1000n,
      carbonEquivalent: 120000n,
    });

    const result = await processPhysicalEsgMetric({
      unit: "KILOMETERS",
      quantity: 1000,
      tenantId: "4d1ea1a4-b6a8-4d12-9eb3-2f0a64ad0ef7",
    });

    expect(result.carbonEquivalent).toBe("120000");
    expect(result.quantity).toBe("1000");
    expect(mocked.createMetricMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quantity: 1000n,
          carbonEquivalent: 120000n,
        }),
      }),
    );
  });
});

