import { describe, it, expect, beforeEach } from "vitest";
import {
  anonymizePIIField,
  sanitizeIngressJsonString,
  sanitizeIngressPayload,
} from "@/app/lib/ironethic/ingressSanitizer";
import { sanitizeThreatIngressPayload } from "@/app/lib/ironethic/sanitizeThreatIngressPayload";
import { ThreatState } from "@prisma/client";

describe("Epic 14 — ingress sanitizer", () => {
  beforeEach(() => {
    process.env.INGEST_SALT_PEPPER = "epic14-unit-pepper";
  });

  it("hashes known PII keys recursively", () => {
    const out = sanitizeIngressPayload({
      tenant_id: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
      raw_data: {
        email: "user@example.com",
        operatorInitials: "AB",
        nested: { fullName: "Jane Doe", phoneNumber: "555-0100" },
        threatId: "t-1",
      },
    }) as {
      raw_data: {
        email: string;
        operatorInitials: string;
        nested: { fullName: string; phoneNumber: string };
        threatId: string;
      };
    };

    expect(out.raw_data.threatId).toBe("t-1");
    expect(out.raw_data.email).toMatch(/^[a-f0-9]{64}$/);
    expect(out.raw_data.operatorInitials).toMatch(/^[a-f0-9]{64}$/);
    expect(out.raw_data.nested.fullName).toMatch(/^[a-f0-9]{64}$/);
    expect(out.raw_data.nested.phoneNumber).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(out)).not.toContain("user@example.com");
  });

  it("sanitizes JSON string columns", () => {
    const raw = JSON.stringify({ email: "ops@medshield.test", note: "ok" });
    const sanitized = sanitizeIngressJsonString(raw);
    expect(sanitized).toBeDefined();
    const parsed = JSON.parse(sanitized!) as { email: string; note: string };
    expect(parsed.note).toBe("ok");
    expect(parsed.email).toMatch(/^[a-f0-9]{64}$/);
  });

  it("throws when INGEST_SALT_PEPPER is missing", () => {
    delete process.env.INGEST_SALT_PEPPER;
    expect(() => anonymizePIIField("x@y.z")).toThrow(/INGEST_SALT_PEPPER/i);
  });

  it("salts by tenant scope so identical identifiers diverge across tenants", () => {
    const outA = sanitizeIngressPayload({
      tenant_id: "tenant-a",
      email: "shared@ironframe.live",
      operatorInitials: "AB",
    }) as { email: string; operatorInitials: string };

    const outB = sanitizeIngressPayload({
      tenant_id: "tenant-b",
      email: "shared@ironframe.live",
      operatorInitials: "AB",
    }) as { email: string; operatorInitials: string };

    expect(outA.email).not.toBe(outB.email);
    expect(outA.operatorInitials).not.toBe(outB.operatorInitials);
  });

  it("sanitizes ThreatEvent create payloads (ingestionDetails JSON)", () => {
    const out = sanitizeThreatIngressPayload({
      title: "Epic 14",
      sourceAgent: "Manual",
      score: 8,
      targetEntity: "Healthcare",
      financialRisk_cents: 0n,
      status: ThreatState.IDENTIFIED,
      ingestionDetails: JSON.stringify({
        email: "analyst@medshield.test",
        operatorInitials: "OPS",
        promotedFromSignalId: "sig-1",
      }),
    });
    const parsed = JSON.parse(out.ingestionDetails as string) as {
      email: string;
      operatorInitials: string;
      promotedFromSignalId: string;
    };
    expect(parsed.promotedFromSignalId).toBe("sig-1");
    expect(parsed.email).toMatch(/^[a-f0-9]{64}$/);
    expect(parsed.operatorInitials).toMatch(/^[a-f0-9]{64}$/);
  });
});
