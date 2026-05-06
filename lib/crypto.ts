import { createHash } from "crypto";

/**
 * CISO / Product Owner attestation seal: SHA-256 over canonical UTF-8
 * `CISO_Name \\n Timestamp_ISO \\n Risk_ID` (concatenation-safe delimiters).
 */
export function computeGovernanceSealHash(input: {
  riskId: string;
  cisoSignature: string;
  timestampIso: string;
}): string {
  const name = input.cisoSignature.trim();
  const ts = input.timestampIso.trim();
  const rid = input.riskId.trim();
  const canonical = `${name}\n${ts}\n${rid}`;
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

/** Alias — forensic seal over Risk ID, digital signature, and timestamp (same canonical UTF-8 SHA-256). */
export const computeForensicSealHash = computeGovernanceSealHash;

/**
 * Non-repudiation anchor: fold the sealed ingestion JSON into the row `governance_hash`
 * (SHA-256 over UTF-8: base attestation digest + newline + canonical ingestion payload).
 */
export function mergeGovernanceHashWithIngestionRecord(input: {
  baseSealHash: string;
  ingestionJsonUtf8: string;
}): string {
  return createHash("sha256")
    .update(input.baseSealHash.trim(), "utf8")
    .update("\n", "utf8")
    .update(input.ingestionJsonUtf8, "utf8")
    .digest("hex");
}

/**
 * Platform attestation seal over the receipt document body digest (binds issuance time + row governance hash).
 */
export function computePlatformForensicSealHash(input: {
  riskId: string;
  governanceHash: string;
  issuedAtIso: string;
  documentBodySha256: string;
}): string {
  const canonical = `${input.riskId.trim()}\n${input.governanceHash.trim()}\n${input.issuedAtIso.trim()}\n${input.documentBodySha256.trim()}`;
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
