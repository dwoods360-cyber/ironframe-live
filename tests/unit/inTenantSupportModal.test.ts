import { describe, expect, it } from "vitest";

import { resolveSupportFrameworkContext } from "@/app/lib/support/resolveSupportFrameworkContext";
import { resolveDefaultSupportObjective } from "@/app/lib/support/supportIntentObjectives";
import { parseInTenantSupportTicketInput } from "@/app/lib/server/customerServiceConsoleCore";

describe("resolveSupportFrameworkContext", () => {
  it("maps export and integrity routes to GRC module contexts", () => {
    expect(resolveSupportFrameworkContext("/exports")).toBe("IRONQUERY_ANALYST_EXPORT");
    expect(resolveSupportFrameworkContext("/integrity")).toBe("INTEGRITY_HUB");
    expect(resolveSupportFrameworkContext("/")).toBe("COMMAND_POST");
  });
});

describe("resolveDefaultSupportObjective", () => {
  it("maps framework context to Golden Path objectives", () => {
    expect(resolveDefaultSupportObjective("IRONQUERY_ANALYST_EXPORT")).toBe("ANALYST_EXPORT");
    expect(resolveDefaultSupportObjective("INTEGRITY_HUB")).toBe("INTEGRITY_REVIEW");
  });
});

describe("parseInTenantSupportTicketInput", () => {
  it("accepts urgency, objective, notes, and telemetry consent", () => {
    const parsed = parseInTenantSupportTicketInput({
      urgency: "DATA_INTEGRITY",
      objective: "ANALYST_EXPORT",
      userNotes: "Export CSV missing tenant scope.",
      attachTelemetry: true,
      frameworkContext: "IRONQUERY_ANALYST_EXPORT",
    });

    expect(parsed?.urgency).toBe("DATA_INTEGRITY");
    expect(parsed?.objective).toBe("ANALYST_EXPORT");
    expect(parsed?.userNotes).toContain("Export CSV");
    expect(parsed?.attachTelemetry).toBe(true);
  });

  it("allows structured objectives without free-text notes", () => {
    const parsed = parseInTenantSupportTicketInput({
      urgency: "ROUTINE",
      objective: "INTEGRITY_REVIEW",
      userNotes: "",
      attachTelemetry: true,
    });
    expect(parsed?.objective).toBe("INTEGRITY_REVIEW");
  });

  it("rejects invalid payloads", () => {
    expect(parseInTenantSupportTicketInput({ urgency: "LOW", objective: "OTHER", userNotes: "x" })).toBeNull();
    expect(parseInTenantSupportTicketInput({ urgency: "ROUTINE", objective: "OTHER", userNotes: "" })).toBeNull();
    expect(parseInTenantSupportTicketInput({ urgency: "ROUTINE", userNotes: "missing objective" })).toBeNull();
  });
});
