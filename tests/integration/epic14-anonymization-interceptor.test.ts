import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/src/services/agents/irongate", () => ({
  IronGate: {
    processIngress: vi.fn(async () => ({ status: "CLEAN", trace_id: "trace-epic14" })),
    ingest: vi.fn(async (payload: any) => ({
      tenant_id: payload.tenant_id,
      data: payload.raw_data,
      status: "CLEAN",
    })),
  },
}));

vi.mock("@/src/services/agents/ironcore", () => ({
  IronCore: {
    routeToAgents: vi.fn(async () => ({
      current_agent: "IRONCORE",
      agent_logs: [],
      status: "ROUTED",
    })),
  },
}));

import { POST as ingestPost } from "@/app/api/ingest/route";
import { IronGate } from "@/src/services/agents/irongate";

describe("Epic 14 — DEI Anonymization Interceptor Regression Suite", () => {
  beforeEach(() => {
    process.env.INGEST_SALT_PEPPER = "epic14-test-pepper";
    vi.clearAllMocks();
  });

  it("aggressively hashes incoming PII fields before ingress processing continues", async () => {
    const rawData = {
      tenant_id: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
      source_type: "API",
      raw_data: {
        threatId: "threat-dei-test",
        operatorInitials: "DWOODS",
        email: "dereck@ironframe.live",
        fullName: "Dereck Woods",
        phoneNumber: "+1-555-123-9900",
      },
    };

    const request = new NextRequest("https://ironframe-live.vercel.app/api/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rawData),
    });

    const response = await ingestPost(request);
    expect(response.status).toBe(200);

    const mockedProcessIngress = vi.mocked(IronGate.processIngress);
    expect(mockedProcessIngress).toHaveBeenCalledTimes(1);
    const interceptedPayload = mockedProcessIngress.mock.calls[0]?.[0] as any;

    expect(interceptedPayload).toBeDefined();
    expect(interceptedPayload.raw_data.threatId).toBe("threat-dei-test");
    expect(interceptedPayload.raw_data.email).toMatch(/^[a-f0-9]{64}$/);
    expect(interceptedPayload.raw_data.operatorInitials).toMatch(/^[a-f0-9]{64}$/);
    expect(interceptedPayload.raw_data.fullName).toMatch(/^[a-f0-9]{64}$/);
    expect(interceptedPayload.raw_data.phoneNumber).toMatch(/^[a-f0-9]{64}$/);

    const serialized = JSON.stringify(interceptedPayload);
    expect(serialized).not.toContain("dereck@ironframe.live");
    expect(serialized).not.toContain("DWOODS");
    expect(serialized).not.toContain("Dereck Woods");
    expect(serialized).not.toContain("+1-555-123-9900");
  });

  it("sanitizes nested PII arrays inside workforce logs", async () => {
    const rawData = {
      tenant_id: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
      source_type: "API",
      raw_data: {
        threatId: "threat-array-test",
        workforceLogs: [
          {
            operatorInitials: "AA",
            email: "alpha@ironframe.live",
            fullName: "Alpha Operator",
            phoneNumber: "+1-555-000-1111",
          },
          {
            operatorInitials: "BB",
            email: "beta@ironframe.live",
            fullName: "Beta Operator",
            phoneNumber: "+1-555-000-2222",
          },
        ],
      },
    };

    const request = new NextRequest("https://ironframe-live.vercel.app/api/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rawData),
    });

    const response = await ingestPost(request);
    expect(response.status).toBe(200);

    const interceptedPayload = vi.mocked(IronGate.processIngress).mock.calls[0]?.[0] as any;
    const logs = interceptedPayload?.raw_data?.workforceLogs;
    expect(Array.isArray(logs)).toBe(true);
    for (const row of logs) {
      expect(row.email).toMatch(/^[a-f0-9]{64}$/);
      expect(row.fullName).toMatch(/^[a-f0-9]{64}$/);
      expect(row.phoneNumber).toMatch(/^[a-f0-9]{64}$/);
      expect(row.operatorInitials).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(JSON.stringify(interceptedPayload)).not.toContain("alpha@ironframe.live");
    expect(JSON.stringify(interceptedPayload)).not.toContain("Beta Operator");
  });

  it("fails closed with 500 when INGEST_SALT_PEPPER is missing", async () => {
    delete process.env.INGEST_SALT_PEPPER;

    const rawData = {
      tenant_id: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
      source_type: "API",
      raw_data: {
        threatId: "threat-dei-test-missing-pepper",
        operatorInitials: "DWOODS",
        email: "dereck@ironframe.live",
      },
    };

    const request = new NextRequest("https://ironframe-live.vercel.app/api/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rawData),
    });

    const response = await ingestPost(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(String(body.error ?? "")).toMatch(/INGEST_SALT_PEPPER/i);
  });

  it("derives tenant-unique hashes for identical user strings", async () => {
    const mkReq = (tenantId: string) =>
      new NextRequest("https://ironframe-live.vercel.app/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          source_type: "API",
          raw_data: {
            threatId: "tenant-hash-test",
            email: "shared@ironframe.live",
            operatorInitials: "XYZ",
          },
        }),
      });

    await ingestPost(mkReq("5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01"));
    const payloadA = vi.mocked(IronGate.processIngress).mock.calls[0]?.[0] as any;
    vi.clearAllMocks();
    await ingestPost(mkReq("4d1ea1a4-b6a8-4d12-9eb3-2f0a64ad0ef7"));
    const payloadB = vi.mocked(IronGate.processIngress).mock.calls[0]?.[0] as any;

    expect(payloadA.raw_data.email).not.toBe(payloadB.raw_data.email);
    expect(payloadA.raw_data.operatorInitials).not.toBe(payloadB.raw_data.operatorInitials);
  });

});
