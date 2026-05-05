import { createHash } from "crypto";

const IRONWATCH_SHRED_ATTESTATION_SALT =
  process.env.IRONFRAME_SHRED_ATTESTATION_SALT?.trim() || "ironframe-nist-800-88-shred-attestation";

/**
 * Ironwatch (Agent 13) — SHA-256 attestation (sync core). Prefer `agentActions.ironwatchSignShredReceiptPayload` (async) for server actions.
 */
export function ironwatchSignShredReceiptPayloadSync(canonicalPayloadUtf8: string): string {
  return createHash("sha256")
    .update(`${canonicalPayloadUtf8}|ironwatch-agent-13|${IRONWATCH_SHRED_ATTESTATION_SALT}`)
    .digest("hex");
}
