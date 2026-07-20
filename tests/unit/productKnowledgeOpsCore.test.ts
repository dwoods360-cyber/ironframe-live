import { describe, expect, it } from "vitest";

import {
  isProductKnowledgeApplyAllowed,
  runProductKnowledgeOps,
} from "@/app/lib/server/productKnowledgeOpsCore";

describe("productKnowledgeOpsCore", () => {
  it("allows apply outside Vercel in non-production (default local)", () => {
    const prevVercel = process.env.VERCEL;
    const prevNode = process.env.NODE_ENV;
    const prevAllow = process.env.IRONFRAME_ALLOW_PRODUCT_KNOWLEDGE_SYNC;
    try {
      delete process.env.VERCEL;
      process.env.NODE_ENV = "development";
      delete process.env.IRONFRAME_ALLOW_PRODUCT_KNOWLEDGE_SYNC;
      expect(isProductKnowledgeApplyAllowed().allowed).toBe(true);
    } finally {
      if (prevVercel === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = prevVercel;
      process.env.NODE_ENV = prevNode;
      if (prevAllow === undefined) delete process.env.IRONFRAME_ALLOW_PRODUCT_KNOWLEDGE_SYNC;
      else process.env.IRONFRAME_ALLOW_PRODUCT_KNOWLEDGE_SYNC = prevAllow;
    }
  });

  it("blocks apply on Vercel", () => {
    const prevVercel = process.env.VERCEL;
    try {
      process.env.VERCEL = "1";
      const gate = isProductKnowledgeApplyAllowed();
      expect(gate.allowed).toBe(false);
      expect(gate.reason).toMatch(/Vercel/i);
    } finally {
      if (prevVercel === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = prevVercel;
    }
  });

  it("check-only ops run returns a report without requiring apply", () => {
    const result = runProductKnowledgeOps({ apply: false });
    expect(result.report.commercialAnchors.pathBCents).toBe("499900");
    expect(result.reportText).toContain("PRODUCT KNOWLEDGE SYNC");
    expect(result.apply).toBe(false);
    expect(typeof result.showFloatingNotice).toBe("boolean");
  });
});
