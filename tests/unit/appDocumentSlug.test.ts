import { describe, expect, it } from "vitest";

import { sanitizeAppDocumentContent } from "@/lib/appDocumentSanitizer";
import {
  assertAppDocsSlugAllowed,
  inferReadingLevelFromSlug,
  normalizeAppDocumentSlug,
  slugSegmentsToDbKey,
} from "@/lib/appDocumentSlug";
import {
  checkInternalGatewayBearerAuth,
  resolveInternalGatewaySecret,
} from "@/app/lib/server/internalGatewayAuth";

describe("appDocumentSlug", () => {
  it("normalizes README and nested paths", () => {
    expect(normalizeAppDocumentSlug("README")).toBe("readme");
    expect(normalizeAppDocumentSlug("user-manuals/quickstart.md")).toBe("user-manuals/quickstart");
    expect(slugSegmentsToDbKey(["README"])).toBe("readme");
    expect(slugSegmentsToDbKey(["user-manuals", "quickstart"])).toBe("user-manuals/quickstart");
  });

  it("infers reading levels from slug prefixes", () => {
    expect(inferReadingLevelFromSlug("user-manuals/quickstart")).toBe("LEVEL_1");
    expect(inferReadingLevelFromSlug("technical/architecture-and-api")).toBe("LEVEL_2");
    expect(inferReadingLevelFromSlug("training/LEVEL1-STUDENT-INDEX")).toBe("TRAINING");
  });

  it("blocks governance briefing slugs on APP_DOCS plane", () => {
    expect(() => assertAppDocsSlugAllowed("briefing-queue/template")).toThrow(/forbidden/i);
  });
});

describe("appDocumentSanitizer", () => {
  it("strips script tags and javascript handlers", () => {
    const raw = "# Title\n<script>alert(1)</script>\n[link](javascript:alert(1))";
    const sanitized = sanitizeAppDocumentContent(raw);
    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("javascript:");
  });
});

describe("internalGatewayAuth", () => {
  it("accepts bearer token when secret matches", () => {
    process.env.INTERNAL_GATEWAY_SECRET_KEY = "test-gateway-secret";
    expect(resolveInternalGatewaySecret()).toBe("test-gateway-secret");
    const request = new Request("http://localhost/api/documentation/execute", {
      method: "POST",
      headers: { Authorization: "Bearer test-gateway-secret" },
    });
    expect(checkInternalGatewayBearerAuth(request)).toBe(true);
    delete process.env.INTERNAL_GATEWAY_SECRET_KEY;
  });
});
