import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockCookiesGet = vi.fn();
const mockCookiesSet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: mockCookiesGet,
    set: mockCookiesSet,
    getAll: vi.fn(() => []),
  })),
  headers: vi.fn(async () => ({
    get: vi.fn(),
  })),
}));

vi.mock("@/app/lib/auth/platformAdminAccess", () => ({
  canUsePlatformAdminTools: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/app/lib/billing/tenantBillingEntitlement", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/lib/billing/tenantBillingEntitlement")>();
  return {
    ...actual,
    assertTenantBillingActive: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@/app/lib/server/inTenantSupportTelemetry", () => ({
  buildInTenantSupportTelemetry: vi.fn().mockResolvedValue(null),
}));

import { POST as handleCustomerServicePost } from "@/app/api/agents/customer-service/route";
import { POST as handleSalesPost } from "@/app/api/agents/sales/route";
import { POST as handleTrainerPost } from "@/app/api/agents/trainer/route";
import { POST as handleWriterPost } from "@/app/api/agents/writer/route";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import prisma from "@/lib/prisma";

const PROSPECT_POOL_TENANT_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_TENANT_ID = TENANT_UUIDS.medshield;

vi.mock("@/app/lib/server/prospectLedger", () => ({
  recordProspectLead: vi.fn().mockResolvedValue({
    slug: "ironframe-innovators",
    orgName: "Ironframe Innovators",
    email: "dereck@minnesota-dev.internal",
  }),
}));

vi.mock("@/app/lib/security/tenantMembershipGuard", () => ({
  assertAuthenticatedIronguardTenantOr403: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    ironboardCrmContact: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    ironboardCrmInteraction: {
      create: vi.fn(),
    },
    appDocument: {
      findMany: vi.fn(),
    },
    agentLog: {
      create: vi.fn(),
    },
  },
}));

const mockGenerateContent = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    text: "Mocked structural platform synthesis proposal report output.",
  }),
);

vi.mock("@google/genai", () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = {
      generateContent: mockGenerateContent,
    };
  },
}));

import { assertAuthenticatedIronguardTenantOr403 } from "@/app/lib/security/tenantMembershipGuard";
import { GRC_SALES_PLAYBOOK } from "@/Ironboard/src/agents/sales/playbook";

function buildJsonRequest(
  url: string,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: new Headers({
      "Content-Type": "application/json",
      ...headers,
    }),
    body: JSON.stringify(body),
  });
}

describe("Phase 2 Agent Perimeter & Ingress Isolation Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookiesGet.mockReturnValue(undefined);
    mockGenerateContent.mockResolvedValue({
      text: "Mocked structural platform synthesis proposal report output.",
    });
    process.env.GOOGLE_API_KEY = "mock_test_key_abc_123";
    process.env.GEMINI_API_KEY = "mock_test_key_abc_123";
    process.env.IRONBOARD_GEMINI_MODEL = "gemini-3.5-flash";
    process.env.IRONFRAME_PROSPECT_POOL_TENANT_UUID = PROSPECT_POOL_TENANT_ID;

    vi.mocked(assertAuthenticatedIronguardTenantOr403).mockResolvedValue({
      ok: true,
      tenantUuid: SESSION_TENANT_ID,
      userId: "user-1",
      membershipEnforced: true,
    });
  });

  it("isolates public sales conversions to the prospect tenant pool and queues a pending CRM draft", async () => {
    vi.mocked(prisma.ironboardCrmContact.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.ironboardCrmContact.create).mockResolvedValue({
      id: "cnt_mock_999",
      tenantId: PROSPECT_POOL_TENANT_ID,
      fullName: "Dereck",
      email: "dereck@minnesota-dev.internal",
      company: "Ironframe Innovators",
      title: "Beachhead:communityHealth [BL_HLTH_111]",
      phone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.ironboardCrmInteraction.create).mockResolvedValue({
      id: "int_mock_001",
      tenantId: PROSPECT_POOL_TENANT_ID,
      contactId: "cnt_mock_999",
      dealId: null,
      channel: "SYSTEM_AGENT",
      summary: "mock",
      occurredAt: new Date(),
      createdAt: new Date(),
    });

    const response = await handleSalesPost(
      buildJsonRequest("http://localhost/api/agents/sales", {
        name: "Dereck",
        email: "dereck@minnesota-dev.internal",
        company: "Ironframe Innovators",
        baselineTarget: "communityHealth",
        notes: "Verifying multi-tenant isolation gates.",
      }),
    );
    const data = (await response.json()) as {
      status?: string;
      interactionId?: string;
      message?: string;
      pitch?: string;
    };

    expect(response.status).toBe(200);
    expect(data.status).toBe("QUEUED");
    expect(data.interactionId).toBe("int_mock_001");
    expect(data.message).toContain("queued for operator review");
    expect(data.pitch).toBeUndefined();

    const healthPlaybook = GRC_SALES_PLAYBOOK.communityHealth;
    const generateCall = mockGenerateContent.mock.calls[0]?.[0] as {
      config?: { systemInstruction?: string };
    };
    const systemInstruction = generateCall?.config?.systemInstruction ?? "";
    expect(systemInstruction).toContain(healthPlaybook.name);
    expect(systemInstruction).toContain(healthPlaybook.targetALE);
    expect(systemInstruction).toContain(healthPlaybook.complianceFrameworks[0]);
    expect(systemInstruction).toContain(healthPlaybook.coreValueProposition.slice(0, 40));

    expect(prisma.ironboardCrmContact.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: PROSPECT_POOL_TENANT_ID,
          email: "dereck@minnesota-dev.internal",
          fullName: "Dereck",
        }),
      }),
    );

    expect(prisma.ironboardCrmInteraction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: PROSPECT_POOL_TENANT_ID,
          contactId: "cnt_mock_999",
          channel: "SYSTEM_AGENT",
          summary: expect.stringContaining("[PENDING SALES DRAFT APPROVAL]"),
        }),
      }),
    );
  });

  it("queues customer service intake for SupportTeam worker without inline Gemini drafting", async () => {
    vi.mocked(prisma.ironboardCrmContact.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.ironboardCrmContact.create).mockResolvedValue({
      id: "cnt_cs_console",
      tenantId: SESSION_TENANT_ID,
      fullName: "Verified Operator",
      email: "console-support+11111111@ironframe.internal",
      company: "Ironframe Tenant Console",
      title: "Support Console Session",
      phone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.ironboardCrmInteraction.create).mockResolvedValue({
      id: "int_cs_001",
      tenantId: SESSION_TENANT_ID,
      contactId: "cnt_cs_console",
      dealId: null,
      channel: "SYSTEM_AGENT",
      summary: "mock",
      occurredAt: new Date(),
      createdAt: new Date(),
    });

    const response = await handleCustomerServicePost(
      buildJsonRequest(
        "http://localhost/api/agents/customer-service",
        { message: "How does the system enforce operational data boundaries?" },
        { "x-tenant-id": SESSION_TENANT_ID },
      ),
    );
    const data = (await response.json()) as {
      status?: string;
      reply?: string;
      interactionId?: string;
    };

    expect(response.status).toBe(200);
    expect(data.status).toBe("QUEUED");
    expect(data.reply).toContain("queued for operator review");
    expect(data.interactionId).toBe("int_cs_001");
    expect(assertAuthenticatedIronguardTenantOr403).toHaveBeenCalled();

    expect(prisma.appDocument.findMany).not.toHaveBeenCalled();

    expect(prisma.ironboardCrmInteraction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: SESSION_TENANT_ID,
          summary: expect.stringContaining("[PENDING SUPPORT INTAKE]"),
        }),
      }),
    );
  });

  it("rejects customer service requests that fail the Ironguard tenant perimeter", async () => {
    vi.mocked(assertAuthenticatedIronguardTenantOr403).mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    });

    const response = await handleCustomerServicePost(
      buildJsonRequest("http://localhost/api/agents/customer-service", {
        message: "Unauthorized probe",
      }),
    );

    expect(response.status).toBe(403);
    expect(prisma.appDocument.findMany).not.toHaveBeenCalled();
  });

  it("grounds trainer sessions on training corpus only and writes audit logs", async () => {
    vi.mocked(prisma.appDocument.findMany).mockResolvedValue([
      {
        id: "doc_tr_01",
        slug: "training/level-1/03-dashboard-navigation",
        title: "Dashboard Navigation",
        content: "Use TopNav to reach /integrity and /cockpit.",
        readingLevel: "TRAINING",
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(prisma.agentLog.create).mockResolvedValue({
      id: "log_01",
      tenantId: SESSION_TENANT_ID,
      message: "mock",
      timestamp: new Date(),
    });

    const response = await handleTrainerPost(
      buildJsonRequest(
        "http://localhost/api/agents/trainer",
        { topic: "Dashboard navigation", message: "Student lab format please." },
        { "x-tenant-id": SESSION_TENANT_ID },
      ),
    );
    const data = (await response.json()) as {
      lesson?: string;
      sourceSlugs?: string[];
      sessionId?: string;
    };

    expect(response.status).toBe(200);
    expect(data.lesson).toContain("Mocked structural platform synthesis");
    expect(data.sourceSlugs).toContain("training/level-1/03-dashboard-navigation");
    expect(data.sessionId).toBeTruthy();
    expect(assertAuthenticatedIronguardTenantOr403).toHaveBeenCalled();

    expect(prisma.appDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { slug: { startsWith: "training/" } },
            { slug: { startsWith: "user-manuals/" } },
          ]),
        }),
      }),
    );
    expect(prisma.agentLog.create).toHaveBeenCalled();
  });

  it("grounds writer sessions on Level 2 technical corpus only and writes audit logs", async () => {
    vi.mocked(prisma.appDocument.findMany).mockResolvedValue([
      {
        id: "doc_wr_01",
        slug: "technical/security-and-compliance",
        title: "Security and Compliance",
        content: "Irongate DMZ sanitizes all external ingress payloads.",
        readingLevel: "LEVEL_2",
        updatedAt: new Date(),
      },
    ]);

    const response = await handleWriterPost(
      buildJsonRequest(
        "http://localhost/api/agents/writer",
        { topic: "Irongate ingress", message: "Practitioner runbook format." },
        { "x-tenant-id": SESSION_TENANT_ID },
      ),
    );
    const data = (await response.json()) as {
      brief?: string;
      sourceSlugs?: string[];
      sessionId?: string;
    };

    expect(response.status).toBe(200);
    expect(data.brief).toContain("Mocked structural platform synthesis");
    expect(data.sourceSlugs).toContain("technical/security-and-compliance");
    expect(data.sessionId).toBeTruthy();

    expect(prisma.appDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { slug: { startsWith: "technical/" } },
            { slug: { startsWith: "training/level-2/" } },
          ]),
        }),
      }),
    );
    expect(prisma.agentLog.create).toHaveBeenCalled();
  });
});
