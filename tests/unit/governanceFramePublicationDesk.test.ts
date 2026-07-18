import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  GF_PUBLICATION_DESK_AGENTS,
  computeReadyForHumanOperator,
  emptyDeskReview,
  readDeskReview,
  scanProductBoundaryFlags,
  scanRegulatoryPrecisionFlags,
  writeDeskReview,
} from "../../lib/governanceFrame/publicationDesk";

describe("Governance Frame publication desk", () => {
  it("registers GF-OPS desk agents that may never promote", () => {
    const ids = GF_PUBLICATION_DESK_AGENTS.map((agent) => agent.id);
    expect(ids).toEqual([
      "gf-researcher",
      "gf-editor",
      "gf-verifier",
      "gf-regulatory-reviewer",
      "gf-product-boundary",
      "gf-operator",
    ]);
    expect(GF_PUBLICATION_DESK_AGENTS.every((agent) => agent.mayPromote === false)).toBe(true);
  });

  it("flags product-boundary and regulatory-precision hazards", () => {
    const product = scanProductBoundaryFlags(
      "The regulation requires Ironframe for all covered entities.",
    );
    expect(product.some((msg) => /requires Ironframe/i.test(msg))).toBe(true);

    const regulatory = scanRegulatoryPrecisionFlags(
      "Under the proposed rule, organizations must adopt the voluntary NIST framework as binding law.",
    );
    expect(regulatory.length).toBeGreaterThan(0);
  });

  it("persists desk-review sidecars under briefing-queue/.desk-reviews", () => {
    const docsRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gf-desk-"));
    const filename = "2026-07-18-draft-gf-desk-sample.md";
    const review = emptyDeskReview(filename);
    review.findings = [
      {
        agentId: "gf-editor",
        status: "pass",
        summary: "ok",
        notes: [],
      },
      {
        agentId: "gf-verifier",
        status: "advisory",
        summary: "ok",
        notes: [],
      },
      {
        agentId: "gf-regulatory-reviewer",
        status: "pass",
        summary: "ok",
        notes: [],
      },
      {
        agentId: "gf-product-boundary",
        status: "pass",
        summary: "ok",
        notes: [],
      },
    ];
    expect(computeReadyForHumanOperator(review)).toBe(true);
    const written = writeDeskReview(docsRoot, review);
    expect(written.ok).toBe(true);
    const loaded = readDeskReview(docsRoot, filename);
    expect(loaded?.readyForHumanOperator).toBe(true);
    expect(loaded?.filename).toBe(filename);
  });

  it("keeps the desk core free of promote imports", () => {
    const corePath = path.join(
      process.cwd(),
      "app/lib/server/governanceFramePublicationDeskCore.ts",
    );
    const source = fs.readFileSync(corePath, "utf-8");
    expect(source).not.toMatch(/from ["'][^"']*promoteBriefingDraftCore["']/);
    expect(source).not.toMatch(/from ["'][^"']*denyBriefingQueueDraftCore["']/);
    expect(source).toMatch(/does NOT import promoteBriefingDraftCore/);
    expect(source).toMatch(/stageBriefingQueueDraftCore/);
  });
});
