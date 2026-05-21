import { describe, expect, it } from "vitest";
import { extractRequirementBlocks } from "@/app/services/ironscribe/forensicIngestor";

describe("forensicIngestor", () => {
  it("extracts requirement blocks from sectioned text", () => {
    const text = `
Section 3.2 ISCM Program Implementation
Organizations shall continuously monitor systems and respond to incidents within 30 days of breach discovery.

Section 5.1 Tenant Isolation
Multi-tenant isolation must be enforced at the database layer.
`;
    const blocks = extractRequirementBlocks(text, { authority: "NIST", title: "SP 800-137" });
    expect(blocks.length).toBeGreaterThanOrEqual(1);
    expect(blocks[0].authority).toBe("NIST");
    expect(blocks.some((b) => b.body.toLowerCase().includes("monitor"))).toBe(true);
  });
});
