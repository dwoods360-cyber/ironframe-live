import { resolve } from "path";
import { config } from "dotenv";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ThreatState } from "@prisma/client";
import type { IroncastDispatchPayload } from "@/types/ironcast";

/** Load `.env.local` before evaluating live-smoke skip flags (Vitest does not load it by default). */
config({ path: resolve(process.cwd(), ".env.local") });

vi.mock("@/lib/prisma", () => ({
  default: {
    threatEvent: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    company: {
      findUnique: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
    },
    systemConfig: {
      findUnique: vi.fn(),
    },
  },
}));

import prisma from "@/lib/prisma";
import { IroncastService } from "@/services/ironcast.service";
import { updateRiskStatus } from "@/lib/risks";

describe("Ironcast: autonomous quarantine escalation", () => {
  beforeEach(() => {
    process.env.THREAT_CONFIRMATION_RECIPIENTS = "ironcast-loop-test@example.com";
    vi.spyOn(IroncastService, "dispatch").mockResolvedValue({ success: true, id: "mock-msg-123" });
    vi.mocked(prisma.systemConfig.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      name: "Medshield Production",
      slug: "medshield-production",
    } as Awaited<ReturnType<typeof prisma.tenant.findUnique>>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.THREAT_CONFIRMATION_RECIPIENTS;
  });

  it("triggers an URGENT Ironcast dispatch when a risk transitions to QUARANTINED", async () => {
    const mockRisk = {
      id: "risk_medshield_001",
      tenant_id: "medshield-production",
      status: "VERIFIED",
      impact_cents: 1110000000n,
    };
    void mockRisk.status;
    void mockRisk.impact_cents;

    vi.mocked(prisma.threatEvent.findUnique).mockResolvedValue({
      status: ThreatState.PIPELINE,
      tenantCompanyId: 1n,
    } as Awaited<ReturnType<typeof prisma.threatEvent.findUnique>>);

    vi.mocked(prisma.company.findUnique).mockResolvedValue({
      tenantId: mockRisk.tenant_id,
    } as Awaited<ReturnType<typeof prisma.company.findUnique>>);

    vi.mocked(prisma.threatEvent.update).mockResolvedValue({} as Awaited<
      ReturnType<typeof prisma.threatEvent.update>
    >);

    const result = await updateRiskStatus(mockRisk.id, "QUARANTINED");

    expect(result.status).toBe("QUARANTINED");
    expect(prisma.threatEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockRisk.id },
        data: { status: ThreatState.QUARANTINED },
      }),
    );

    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { id: mockRisk.tenant_id },
      select: { slug: true, name: true },
    });

    expect(IroncastService.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        notification: expect.objectContaining({
          priority: "URGENT",
          subject: expect.stringContaining(mockRisk.id),
        }),
        tenant_id: "Medshield Production",
        sanitization_status: "VERIFIED_SYSTEM_GENERATED",
        irongate_trace_id: expect.stringMatching(/^ironlock-quarantine-/),
      }),
    );
  });
});

const resendConfigured = Boolean(process.env.RESEND_API_KEY?.trim());
const smokeRecipient =
  process.env.IRONCAST_SMOKE_RECIPIENT?.trim() ||
  process.env.IRONCAST_SMOKE_TEST_EMAIL?.trim();

describe.skipIf(!resendConfigured || !smokeRecipient)("Ironcast: live provider smoke", () => {
  it("dispatches a sanitized NOTICE alert via Resend", async () => {
    const testPayload: IroncastDispatchPayload = {
      tenant_id: "system-test-001",
      sanitization_status: "VERIFIED_SYSTEM_GENERATED",
      irongate_trace_id: "trace_smoketest_001",
      recipient: {
        email: smokeRecipient!,
        role: "SYSTEM_ADMIN",
      },
      notification: {
        priority: "NOTICE",
        subject: "Ironframe Communication Engine Active",
        body_summary: "Ironcast service has been successfully initialized and verified.",
      },
      timestamp: BigInt(Date.now()),
    };

    const result = await IroncastService.dispatch(testPayload);
    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });
});
