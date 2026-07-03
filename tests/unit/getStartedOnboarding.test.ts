import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/get-started/progress/route";
import { logGetStartedProgress } from "@/app/lib/server/getStartedOnboardingCore";
import { assertAuthenticatedIronguardTenantOr403 } from "@/app/lib/security/tenantMembershipGuard";
import prisma from "@/lib/prisma";

vi.mock("@/app/lib/security/tenantMembershipGuard", () => ({
  assertAuthenticatedIronguardTenantOr403: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    agentLog: {
      create: vi.fn(),
    },
  },
}));

const TENANT_ID = "22222222-2222-4222-8222-222222222222";

function buildJsonRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/get-started/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/get-started/progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertAuthenticatedIronguardTenantOr403).mockResolvedValue({
      ok: true,
      tenantUuid: TENANT_ID,
      userId: "user-1",
      membershipEnforced: true,
    });
    vi.mocked(prisma.agentLog.create).mockResolvedValue({} as never);
  });

  it("returns 403 when tenant guard fails", async () => {
    vi.mocked(assertAuthenticatedIronguardTenantOr403).mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    });

    const res = await POST(buildJsonRequest({ stepId: "quickstart", completed: true }));
    expect(res.status).toBe(403);
    expect(prisma.agentLog.create).not.toHaveBeenCalled();
  });

  it("returns 400 when stepId is missing", async () => {
    const res = await POST(buildJsonRequest({ completed: true }));
    expect(res.status).toBe(400);
    expect(prisma.agentLog.create).not.toHaveBeenCalled();
  });

  it("logs TRAINING_ONBOARDING progress for a valid tenant session", async () => {
    const res = await POST(
      buildJsonRequest({ stepId: "integrity-hub", completed: true, allComplete: false }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status?: string };
    expect(body.status).toBe("LOGGED");

    expect(prisma.agentLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          message: expect.stringContaining("TRAINING_ONBOARDING"),
        }),
      }),
    );
  });
});

describe("logGetStartedProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.agentLog.create).mockResolvedValue({} as never);
  });

  it("persists step completion with audit tag", async () => {
    await logGetStartedProgress({
      tenantId: TENANT_ID,
      stepId: "trainer-session",
      completed: true,
      allComplete: true,
    });

    expect(prisma.agentLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          message: expect.stringMatching(/TRAINING_ONBOARDING.*trainer-session.*true/),
        }),
      }),
    );
  });
});
