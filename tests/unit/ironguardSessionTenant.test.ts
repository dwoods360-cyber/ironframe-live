import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    $transaction: mocks.transaction,
  },
}));

import {
  bindIronguardTenant,
  withIronguardTenant,
} from "@/app/lib/server/ironguardSessionTenant";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";

describe("Ironguard transaction tenant binding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("binds through the database function when available", async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ present: true }]),
      $executeRaw: vi.fn().mockResolvedValue(1),
    };

    await bindIronguardTenant(tx as never, TENANT_ID);

    expect(tx.$queryRaw).toHaveBeenCalledOnce();
    expect(tx.$executeRaw).toHaveBeenCalledOnce();
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.$executeRaw.mock.invocationCallOrder[0],
    );
  });

  it("uses transaction-local set_config when the function is absent", async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ present: false }]),
      $executeRaw: vi.fn().mockResolvedValue(1),
    };

    await bindIronguardTenant(tx as never, TENANT_ID);

    expect(tx.$executeRaw).toHaveBeenCalledOnce();
    expect(tx.$executeRaw.mock.calls[0]?.[1]).toBe(TENANT_ID);
  });

  it("rejects malformed tenant identifiers before opening a transaction", async () => {
    await expect(withIronguardTenant("not-a-uuid", async () => "unreachable")).rejects.toThrow(
      "IRONGUARD_SESSION_TENANT_UUID_REQUIRED",
    );
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("binds before running tenant work on the transaction client", async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ present: true }]),
      $executeRaw: vi.fn().mockResolvedValue(1),
    };
    const run = vi.fn().mockResolvedValue("ok");
    mocks.transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );

    await expect(withIronguardTenant(TENANT_ID, run)).resolves.toBe("ok");
    expect(run).toHaveBeenCalledWith(tx);
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      run.mock.invocationCallOrder[0],
    );
  });
});
