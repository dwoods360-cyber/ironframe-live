import { describe, expect, it } from "vitest";
import {
  alternativesForWeakLexeme,
  appendForensicScoreToMetadataTag,
  computeForensicAttestationScore,
  exceedsWeakLexiconToneLock,
  hasWeakLexiconViolation,
  reachesForensicNeutralizeQualityBar,
  replaceSpanInCombinedAttestation,
} from "@/app/utils/grcLexicon";

describe("grcLexicon", () => {
  it("flags weak hedging terms", () => {
    expect(hasWeakLexiconViolation("I think we verified the Irongate logs for this tenant.")).toBe(true);
    expect(hasWeakLexiconViolation("Irongate verified; isolation confirmed per TAS baseline.")).toBe(false);
  });

  it("scores TAS + authoritative + technical and reaches Verified", () => {
    const s =
      "Irongate Agent 14 perimeter validated; tenant isolation verified and constitutional baseline confirmed for $11.1M ALE.";
    const r = computeForensicAttestationScore(s);
    expect(r.total).toBeGreaterThan(40);
    expect(r.meetsVerifiedThreshold).toBe(true);
    expect(reachesForensicNeutralizeQualityBar(s)).toBe(true);
  });

  it("appends forensic score to metadata_tag", () => {
    const s = "Irongate verified; isolation attested; Agent 14 authenticated; baseline remediated.";
    const tag = appendForensicScoreToMetadataTag("threatId:abc|HUMAN", s);
    expect(tag).toContain("forensicScore=");
    expect(tag).toContain("forensicGrade=");
  });

  it("maps weak lexemes to authoritative alternatives", () => {
    expect(alternativesForWeakLexeme("think")).toContain("verified");
    expect(alternativesForWeakLexeme("maybe")).toContain("validated");
    expect(alternativesForWeakLexeme("fixed")).toContain("remediated");
    expect(alternativesForWeakLexeme("should be").join(" ")).toContain("conforms");
  });

  it("tone-locks when more than two weak spans exist", () => {
    const s = "I think maybe possibly we should be guessing about Irongate.";
    expect(exceedsWeakLexiconToneLock(s)).toBe(true);
    expect(reachesForensicNeutralizeQualityBar(s)).toBe(false);
  });

  it("replaces a span in combined machine + human attestation", () => {
    const r = replaceSpanInCombinedAttestation("Machine line", "I think this is ok", 18, 23, "verified");
    expect(r.humanExtension).toContain("verified");
    expect(r.humanExtension).not.toContain("think");
  });

  it("Gold tier at high cumulative score without weak lexicon", () => {
    const s =
      "Irongate Agent 14 authenticated; tenant RLS isolation verified; constitutional baseline re-baselined; $11.1M ALE validated and remediated.";
    const r = computeForensicAttestationScore(s);
    expect(r.isGold).toBe(true);
    expect(r.gradeBand).toBe("Gold");
  });
});
