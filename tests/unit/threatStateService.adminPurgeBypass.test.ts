import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThreatState } from "@prisma/client";
import {
  GRC_RESOLUTION_GATE_ADMIN_BYPASS_DETAIL,
  MANUAL_BOARD_PURGE_FOR_TEST_BASELINE_REASON,
} from "@/src/constants/grcManualPurge";
import { transitionThreatStatus } from "@/src/services/threatStateService";

const { prismaMock, threatUpdate, logEvent } = vi.hoisted(() => {
  const logEventInner = vi.fn(async () => ({}));
  const threatUpdateInner = vi.fn(async () => ({ id: "t1", financialRisk_cents: 0n }));
  const mock: {
    threatEvent: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
    company: { findUnique: ReturnType<typeof vi.fn> };
    threatApproval: { findUnique: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
    $executeRaw: ReturnType<typeof vi.fn>;
  } = {
    threatEvent: { findUnique: vi.fn(), update: threatUpdateInner },
    company: { findUnique: vi.fn() },
    threatApproval: { findUnique: vi.fn() },
    $transaction: vi.fn(),
    $executeRaw: vi.fn(async () => undefined),
  };
  mock.$transaction.mockImplementation(async (fn: (tx: typeof mock) => Promise<unknown>) =>
    fn(mock),
  );
  return { prismaMock: mock, threatUpdate: threatUpdateInner, logEvent: logEventInner };
});

vi.mock("@/src/services/integrityService", () => ({
  integrityService: {
    logEvent,
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}));

describe("transitionThreatStatus RESOLVED admin purge bypass", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.company.findUnique.mockResolvedValue({ tenantId: "tenant-1" });
    prismaMock.threatApproval.findUnique.mockResolvedValue(null);
    prismaMock.threatEvent.findUnique.mockImplementation(async (args: { select?: Record<string, boolean> }) => {
      const s = args?.select ?? {};
      if (s.status && s.tenantCompanyId && s.id) {
        return { id: "t1", tenantCompanyId: "c1", status: ThreatState.CONFIRMED };
      }
      if (s.resolutionApprovalId !== undefined) {
        return { id: "t1", tenantCompanyId: "c1", resolutionApprovalId: null };
      }
      return null;
    });
  });

  it("throws GRC_PROTOCOL_VIOLATION when resolving without approval and no bypass reason", async () => {
    await expect(
      transitionThreatStatus({
        threatId: "t1",
        newStatus: ThreatState.RESOLVED,
        actorUserId: "u1",
      }),
    ).rejects.toThrow(/GRC_PROTOCOL_VIOLATION/);
    expect(prismaMock.threatApproval.findUnique).not.toHaveBeenCalled();
  });

  it("skips approval gate when reason matches manual board purge and logs bypass fields", async () => {
    await transitionThreatStatus({
      threatId: "t1",
      newStatus: ThreatState.RESOLVED,
      actorUserId: "system-purge",
      reason: MANUAL_BOARD_PURGE_FOR_TEST_BASELINE_REASON,
      eventType: "THREAT_RESOLVED_PURGE_ROW",
    });

    expect(prismaMock.threatApproval.findUnique).not.toHaveBeenCalled();
    expect(threatUpdate).toHaveBeenCalled();
    expect(logEvent).toHaveBeenCalledTimes(1);
    const firstCall = logEvent.mock.calls[0] as unknown[] | undefined;
    expect(firstCall?.length).toBeGreaterThanOrEqual(2);
    const payload = (firstCall![1] as { payload: Record<string, unknown> }).payload;
    expect(payload.grcResolutionGateBypassed).toBe(true);
    expect(payload.grcResolutionGateBypassDetail).toBe(GRC_RESOLUTION_GATE_ADMIN_BYPASS_DETAIL);
    expect(payload.grcResolutionBypassReason).toBe(MANUAL_BOARD_PURGE_FOR_TEST_BASELINE_REASON);
  });
});
