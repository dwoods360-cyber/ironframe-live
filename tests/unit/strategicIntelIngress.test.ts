import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  formatPeerAleMillionsFromCents,
  STRATEGIC_INTEL_UPDATE_CLASSIFICATION,
} from "@/lib/strategicIntel/strategicIntelResearchStore";

describe("strategicIntelResearchStore", () => {
  it("formats peer ALE from whole-cent bigint strings without float drift", () => {
    expect(formatPeerAleMillionsFromCents("1210000000")).toBe("12.1M");
    expect(formatPeerAleMillionsFromCents("1800000000")).toBe("18.0M");
    expect(formatPeerAleMillionsFromCents("2500000000")).toBe("25.0M");
  });

  it("manifest JSON matches Strategic Intel Update classification", () => {
    const manifestPath = path.join(
      process.cwd(),
      "Ironboard/src/knowledge/grcProfessionalResearch.manifest.json",
    );
    const raw = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
      classification: string;
      manifestVersion: string;
      documents: unknown[];
    };
    expect(raw.classification).toBe(STRATEGIC_INTEL_UPDATE_CLASSIFICATION);
    expect(raw.manifestVersion).toBe("1.0.0");
    expect(raw.documents).toHaveLength(2);
  });
});

describe("strategicIntel sanitizer (manifest integrity)", () => {
  it("rejects float cents in risk metrics at validation layer", async () => {
    const { validateStrategicIntelManifest } = await import(
      "../../Ironboard/src/services/crm/strategicIntelSanitizer.ts"
    );
    const manifestPath = path.join(
      process.cwd(),
      "Ironboard/src/knowledge/grcProfessionalResearch.manifest.json",
    );
    const valid = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    expect(() => validateStrategicIntelManifest(valid)).not.toThrow();

    const poisoned = structuredClone(valid) as Record<string, unknown>;
    const docs = poisoned.documents as Array<Record<string, unknown>>;
    const metrics = docs[0].riskMetricsCents as Record<string, string>;
    metrics.medianAnnualGrcProgramCents = "42.5";
    expect(() => validateStrategicIntelManifest(poisoned)).toThrow(/whole-cent integer strings/i);
  });

  it("strips script tags during DMZ sanitization", async () => {
    const { sanitizeManifestRecord } = await import(
      "../../Ironboard/src/services/crm/strategicIntelSanitizer.ts"
    );
    const dirty = {
      title: "ok<script>alert(1)</script>",
      nested: { x: 1 },
    };
    const clean = sanitizeManifestRecord(dirty) as { title: string };
    expect(clean.title).not.toContain("<script");
    expect(clean.title).toContain("[STRIPPED]");
  });
});
