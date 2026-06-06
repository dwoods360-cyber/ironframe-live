import { describe, expect, it } from "vitest";

import { instantiateBoardAgentModel } from "../src/config/modelFactory.js";
import { VECTOR_STORAGE_NAMESPACES } from "../src/config/vectorNamespaces.js";
import { RAG_GROUNDING_DIRECTIVE, buildGroundedSystemPrompt } from "../src/prompts.js";
import {
  INSUFFICIENT_CONTEXT_RESPONSE,
  screenFinancialIntegrity,
  validateOutboundContent,
} from "../src/validation/contentFirewall.js";
import { ContentFirewallRejectedError, writeHubAssetSafely } from "../src/io/safeDocsWriter.js";

describe("deterministic model factory", () => {
  it("locks temperature and topP to zero for every board agent role", () => {
    for (const role of ["CEO", "CFO", "CCO", "LEGAL", "TRAINER", "WRITER"] as const) {
      const model = instantiateBoardAgentModel(role);
      expect(model.generation.temperature).toBe(0.0);
      expect(model.generation.topP).toBe(0.0);
      expect(model.systemPrompt).toContain(RAG_GROUNDING_DIRECTIVE);
    }
  });

  it("binds secure vector namespaces for Trainer and Writer only", () => {
    expect(instantiateBoardAgentModel("TRAINER").vectorNamespace).toBe(
      VECTOR_STORAGE_NAMESPACES.USER_TRAINER,
    );
    expect(instantiateBoardAgentModel("WRITER").vectorNamespace).toBe(
      VECTOR_STORAGE_NAMESPACES.TECHNICAL_WRITER,
    );
    expect(instantiateBoardAgentModel("CEO").vectorNamespace).toBeNull();
  });
});

describe("RAG grounding directives", () => {
  it("embeds the compliance string in every grounded system prompt", () => {
    for (const role of ["CEO", "CFO", "COMPLIANCE", "LEGAL", "TRAINER", "WRITER"] as const) {
      expect(buildGroundedSystemPrompt(role)).toContain("INSUFFICIENT UNDERLYING COMPLIANCE CONTEXT");
    }
  });
});

describe("content firewall — financial integrity", () => {
  it("allows whole-integer cent fields", () => {
    const content = "amount_cents: 1110000000\nsource-file: docs/hub.md";
    expect(validateOutboundContent(content, { agentRole: "WRITER" }).ok).toBe(true);
  });

  it("rejects floating-point decimals in financial evaluation nodes", () => {
    const content = "amount_cents: 1110000000.5\nsource-file: docs/hub.md";
    const result = validateOutboundContent(content, { agentRole: "WRITER" });
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.includes("floating-point"))).toBe(true);
  });

  it("rejects dollar float presentation in financial context", () => {
    const violations = screenFinancialIntegrity(
      "premium baseline $11.1M equivalent\nsource-file: docs/TAS.md",
    );
    expect(violations.length).toBeGreaterThan(0);
  });

  it("permits insufficient-context verbatim response without source refs", () => {
    expect(
      validateOutboundContent(INSUFFICIENT_CONTEXT_RESPONSE, { agentRole: "TRAINER" }).ok,
    ).toBe(true);
  });

  it("blocks ungrounded docs missing source-file references", () => {
    const content = "Invented feature: quantum freeze bypass enabled.";
    const result = validateOutboundContent(content, { agentRole: "TRAINER" });
    expect(result.ok).toBe(false);
  });
});

describe("content firewall — outbound write hook", () => {
  it("throws ContentFirewallRejectedError on invalid monetary content", () => {
    expect(() =>
      writeHubAssetSafely(
        "training/ironboard/bad-cents.html",
        "<p>amount_cents: 590000000.25</p>",
        "WRITER",
      ),
    ).toThrow(ContentFirewallRejectedError);
  });
});
