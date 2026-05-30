import { describe, it, expect } from "vitest";
import { compileOrchestrationGraph } from "../../src/services/orchestration/forensicPipelineGraph";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";

const VAULTBANK_TENANT_UUID = TENANT_UUIDS.vaultbank;
const RLS_POLICY_LINE =
  /^CREATE POLICY rls_[a-z0-9_]+_[a-zA-Z0-9_-]+ ON public\.tenant_data FOR ALL TO authenticated USING \(tenant_id = '[a-f0-9-]+'\);$/;

describe("Sovereign Orchestration Bus - Integration Pipeline", () => {
  
  // 1. VERIFY ACTIVE DMZ BOUNDARY COMPLIANCE
  describe("Perimeter DMZ Guard (Irongate Enforced)", () => {
    it("enforces irongateSanitize as the absolute first node execution block post-invocation", async () => {
      // Accessing the active forensic pipeline graph definition
      const graph = compileOrchestrationGraph();
      
      // Construct an un-sanitized payload simulating raw ingress threat telemetry
      const rawPayload = {
        tenantId: "vaultbank",
        source: "EXTERNAL_INGRESS",
        maliciousSignatureDetected: true,
        payloadContent: "DROP ALL TABLES; --",
      };

      const result = await graph.invoke({
        payload: rawPayload,
        history: [],
      });

      // Assert that the perimeter was enforced and logged in the state array
      expect(result.history[0]).toBeDefined();
      expect(result.history[0].agent).toBe("Irongate");
      expect(result.history[0].status).toBe("SANITIZED");
      
      // Ensure the payload received by downstream components has been modified by the DMZ layer
      expect(result.sanitizationStamp).toBe(true);
    });
  });

  // 2. OSINT INTAKE GATE (EPIC 10)
  describe("OSINT Intake Gate (Ironintel ➡️ Irongate Handoff)", () => {
    it("routes raw Ironintel threat intelligence events directly to Irongate for DMZ sanitization before bus broadcasting", async () => {
      const graph = compileOrchestrationGraph();

      const rawPayload = {
        tenantId: "vaultbank",
        source: "OSINT",
        maliciousSignatureDetected: true,
        payloadContent: "MALICIOUS_CVE_FEED_ATTEMPT",
        cve: "CVE-2024-9999",
      };

      const result = await graph.invoke({
        payload: rawPayload,
        history: [],
      });

      expect(result).toBeDefined();
      expect(result.osintEnveloped).toBe(true);
      expect(result.sanitizationStamp).toBe(true);
      expect(result.payload?.preSanitized).toBe(false);

      expect(
        result.historyLogs.some((entry) => entry.agentId.includes("Ironintel")),
      ).toBe(true);
      expect(
        result.history.some(
          (entry) => entry.agent === "Irongate" && entry.status === "SANITIZED",
        ),
      ).toBe(true);

      expect(result.sanitizedPayload?.tenantId).toBeTruthy();
      expect(result.sanitizedPayload?.tenant_id).toBeTruthy();
    });
  });

  describe("Compliance-to-Settings Pipeline (Irontally ➡️ Ironlogic ➡️ Irontrust)", () => {
    it("maps structural CSRD framework metadata into machine-enforceable database Row Level Security rules", async () => {
      const graph = compileOrchestrationGraph();

      const rawPayload = {
        tenantId: "vaultbank",
        source: "EXTERNAL_INGRESS",
        maliciousSignatureDetected: false,
        payloadContent: "CSRD-2026-COMPLIANCE",
      };

      const result = await graph.invoke({
        payload: rawPayload,
        history: [],
      });

      // Workflow resolves with defined terminal outputs
      expect(result).toBeDefined();
      expect(result.tenantId).toBe(VAULTBANK_TENANT_UUID);
      expect(result.sanitizationStamp).toBe(true);
      expect(result.complianceFrameworkId).toBe("csrd_esrs");
      expect(result.sanitizedPayload?.tenantId).toBe(VAULTBANK_TENANT_UUID);
      expect(result.financialImpactCents).toBeDefined();
      expect(BigInt(result.financialImpactCents ?? "0")).toBeGreaterThanOrEqual(0n);
      expect(result.currentAssignee).toBeNull();

      // historyLogs — Index 19 (Irontally) then Index 09 (Ironlogic), in execution order
      const irontallyIdx = result.historyLogs.findIndex((entry) =>
        /Irontally.*Agent 19|Agent 19.*Irontally/i.test(entry.agentId),
      );
      const ironlogicIdx = result.historyLogs.findIndex((entry) =>
        /Ironlogic.*Agent 09|Agent 09.*Ironlogic/i.test(entry.agentId),
      );
      expect(irontallyIdx).toBeGreaterThanOrEqual(0);
      expect(ironlogicIdx).toBeGreaterThan(irontallyIdx);
      expect(result.historyLogs[irontallyIdx].message).toMatch(/Framework mapped/i);
      expect(result.historyLogs[ironlogicIdx].message).toMatch(
        /deterministic RLS policy statement/i,
      );

      // rlsPolicyStatements — defined, non-empty, UUID-bound, structurally valid
      expect(result.rlsPolicyStatements).toBeDefined();
      expect(Array.isArray(result.rlsPolicyStatements)).toBe(true);
      expect(result.rlsPolicyStatements!.length).toBeGreaterThan(0);
      expect(result.rlsPolicyStatements!.length).toBe(result.complianceBadges.length);

      const injectionNeedles = [
        "CSRD-2026-COMPLIANCE",
        "EXTERNAL_INGRESS",
        "DROP ALL TABLES",
        "MALICIOUS",
        "<script",
        "';",
        "--",
        "/*",
      ];

      for (const statement of result.rlsPolicyStatements!) {
        expect(typeof statement).toBe("string");
        expect(statement.length).toBeGreaterThan(0);
        expect(statement).toMatch(RLS_POLICY_LINE);
        expect(statement).toContain(`tenant_id = '${VAULTBANK_TENANT_UUID}'`);
        expect(statement).toContain("rls_csrd_esrs_");

        for (const needle of injectionNeedles) {
          expect(statement).not.toContain(needle);
        }
      }
    });
  });
});
