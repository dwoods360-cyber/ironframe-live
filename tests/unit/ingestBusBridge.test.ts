import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import {
  buildForensicIngressPayload,
  ingestOrchestrationBusDisabled,
  invokeIngestOrchestrationBus,
  resolveIngestOrchestrationLane,
  resolveIngressSource,
} from "@/src/services/orchestration/ingestBusBridge";

const forensicInvoke = vi.fn();
const sovereignInvoke = vi.fn();

vi.mock("@/src/services/orchestration/forensicPipelineGraph", () => ({
  compileOrchestrationGraph: () => ({
    invoke: forensicInvoke,
  }),
}));

vi.mock("@/src/services/orchestration/graph", () => ({
  compileSovereignOrchestrationBus: async () => ({
    invoke: sovereignInvoke,
  }),
}));

describe("ingestBusBridge", () => {
  beforeEach(() => {
    forensicInvoke.mockReset();
    sovereignInvoke.mockReset();
    delete process.env.IRONFRAME_INGEST_SOVEREIGN_BUS;
    delete process.env.IRONFRAME_INGEST_FORENSIC_GRAPH;
    delete process.env.IRONFRAME_INGEST_BUS_DISABLED;

    forensicInvoke.mockResolvedValue({
      history: [{ agent: "irongate", status: "CLEAN" }],
      historyLogs: [{ agentId: "irongate", timestamp: "t", message: "DMZ clean" }],
      sanitizationStamp: true,
      osintEnveloped: false,
      rlsPolicyStatements: ["CREATE POLICY p ON threats"],
      complianceFrameworkId: "",
      routingTarget: "ironsight",
    });

    sovereignInvoke.mockResolvedValue({
      agent_logs: ["[IRONCORE] routed"],
      current_agent: "IRONQUERY",
      ironquery_summary_signature: "sig-abc",
      status: "COMPLETED",
      routing_target: "ironlock",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("honors skipOrchestrationBus on payload", () => {
    expect(ingestOrchestrationBusDisabled({ skipOrchestrationBus: true })).toBe(true);
    expect(ingestOrchestrationBusDisabled({ skipOrchestrationBus: "1" })).toBe(true);
    expect(ingestOrchestrationBusDisabled({})).toBe(
      process.env.IRONFRAME_INGEST_BUS_DISABLED === "1",
    );
  });

  it("returns error when tenant or threat id missing", async () => {
    const result = await invokeIngestOrchestrationBus({
      tenantId: "",
      threatId: "abc",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("MISSING_TENANT_OR_THREAT_ID");
  });

  it("defaults to forensic lane and maps vaultbank tenant slug for Irongate", async () => {
    const result = await invokeIngestOrchestrationBus({
      tenantId: TENANT_UUIDS.vaultbank,
      threatId: "threat-forensic-1",
    });

    expect(result.ok).toBe(true);
    if (!result.ok || result.lane !== "forensic") return;
    expect(result.sanitizationStamp).toBe(true);
    expect(result.rlsPolicyStatements).toHaveLength(1);
    expect(forensicInvoke).toHaveBeenCalledOnce();
    expect(sovereignInvoke).not.toHaveBeenCalled();

    const invokeArg = forensicInvoke.mock.calls[0][0];
    expect(invokeArg.threatId).toBe("threat-forensic-1");
    expect(invokeArg.payload.tenantId).toBe("vaultbank");
    expect(invokeArg.payload.source).toBe("EXTERNAL_INGRESS");
  });

  it("routes OSINT source through forensic lane with OSINT payload", async () => {
    const payload = buildForensicIngressPayload(
      { tenantId: TENANT_UUIDS.medshield, threatId: "osint-1" },
      { body: { source: "OSINT" } },
    );
    expect(payload.source).toBe("OSINT");
    expect(resolveIngressSource({ source: "OSINT" }, {}, {})).toBe("OSINT");
    expect(resolveIngestOrchestrationLane({ source: "OSINT" })).toBe("forensic");

    const result = await invokeIngestOrchestrationBus(
      { tenantId: TENANT_UUIDS.medshield, threatId: "osint-1" },
      { body: { source: "OSINT" } },
    );
    expect(result.ok).toBe(true);
    if (!result.ok || result.lane !== "forensic") return;
    expect(result.osintEnveloped).toBe(false);
    expect(forensicInvoke.mock.calls[0][0].payload.source).toBe("OSINT");
  });

  it("honors sovereign lane when useSovereignBus is set", async () => {
    const result = await invokeIngestOrchestrationBus(
      { tenantId: TENANT_UUIDS.gridcore, threatId: "sov-1" },
      { body: { useSovereignBus: true } },
    );

    expect(result.ok).toBe(true);
    if (!result.ok || result.lane !== "sovereign") return;
    expect(result.ironquerySignature).toBe("sig-abc");
    expect(sovereignInvoke).toHaveBeenCalledOnce();
    expect(forensicInvoke).not.toHaveBeenCalled();
  });

  it("stamps compliance content for forensic CSRD ingress", async () => {
    const result = await invokeIngestOrchestrationBus(
      { tenantId: TENANT_UUIDS.vaultbank, threatId: "csrd-1" },
      { body: { contentTag: "CSRD-2026-COMPLIANCE" } },
    );

    expect(result.ok).toBe(true);
    expect(forensicInvoke.mock.calls[0][0].payload.payloadContent).toBe("CSRD-2026-COMPLIANCE");
  });
});
