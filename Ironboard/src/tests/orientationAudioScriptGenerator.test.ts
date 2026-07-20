import { describe, expect, it } from "vitest";

import { sampleIronframeDocumentationBrief } from "../../tests/fixtures/documentationBrief.js";
import {
  buildDeterministicOrientationScript,
  loadOrientationCorpusSources,
} from "../services/orientationAudioScriptGenerator.js";

describe("orientationAudioScriptGenerator", () => {
  it("deterministic backbone is Bucket B safe and cites corpus sources", () => {
    const brief = sampleIronframeDocumentationBrief();
    const sources = loadOrientationCorpusSources();
    const body = buildDeterministicOrientationScript(brief, sources);

    expect(body).toContain("source-file: docs/user-manuals/design-partner-operator-packet.md");
    expect(body).toContain("Command Post");
    expect(body).toContain("curated partner training");
    expect(body).toContain("multi-turn");
    expect(body).toContain("slash exports");
    expect(body.toLowerCase()).not.toContain("twenty-four-chapter");
    expect(body.toLowerCase()).not.toContain("twelve-chapter");
    expect(body.toLowerCase()).not.toContain("dashboard exports");
    expect(body.toLowerCase()).not.toContain("ask one question");
    expect(body.toLowerCase()).not.toContain("cryptographic key");
    expect(body.toLowerCase()).not.toContain("locate your welcome message");
    expect(body.toLowerCase()).not.toContain("initialize workspace link from your invite");
  });
});
