import { describe, expect, it } from "vitest";

import {
  mergeWorkNotesWithPipelineTriage,
  readPipelineGrcJustificationFromThreat,
} from "@/app/utils/pipelineTriageWorkNotes";

describe("pipelineTriageWorkNotes", () => {
  it("reads grcJustification from ingestionDetails JSON", () => {
    const text = readPipelineGrcJustificationFromThreat({
      ingestionDetails: JSON.stringify({
        grcJustification: "Forensic attestation for control stress test gap CC6.1 with sufficient length.",
      }),
    });
    expect(text).toContain("Forensic attestation");
  });

  it("prepends read-only pipeline triage note when DB work notes are empty", () => {
    const grc =
      "Operator attestation: control stress validates annex gap with documented forensic rationale.";
    const merged = mergeWorkNotesWithPipelineTriage(
      {
        createdAt: "2026-07-09T20:00:00.000Z",
        ingestionDetails: JSON.stringify({ grcJustification: grc }),
        workNotes: [],
      },
      [],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.pipelineTriage).toBe(true);
    expect(merged[0]?.user).toBe("Pipeline triage");
    expect(merged[0]?.text).toBe(grc);
  });

  it("does not duplicate when a work note already matches pipeline justification", () => {
    const grc = "Matching acknowledge justification already stored as work note.";
    const merged = mergeWorkNotesWithPipelineTriage(
      {
        ingestionDetails: JSON.stringify({ grcJustification: grc }),
        workNotes: [{ text: grc, timestamp: "2026-07-09T20:01:00.000Z", user: "Operator" }],
      },
      [],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.pipelineTriage).toBeUndefined();
  });
});
