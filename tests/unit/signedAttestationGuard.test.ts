import { describe, it, expect } from "vitest";
import { ingestionDetailsIndicateSignedAttestation } from "@/app/lib/evidence/signedAttestationGuard";

describe("signedAttestationGuard — ingestion heuristics", () => {
  it("detects bank vault HITL release signature in ingestionDetails", () => {
    const raw = JSON.stringify({
      bankVaultHitlRelease: {
        event: "BANK_VAULT_HITL_RELEASE",
        attestationSignature: "base64-sig-material",
      },
    });
    expect(ingestionDetailsIndicateSignedAttestation(raw)).toBe(true);
  });

  it("detects shadow CISO handshake attestation signature", () => {
    const raw = {
      shadowCisoHandshake: {
        attestationSignature: "hmac-hex-sig",
        resolutionApprovalId: "approval-001",
      },
    };
    expect(ingestionDetailsIndicateSignedAttestation(raw)).toBe(true);
  });

  it("returns false when no signed attestation markers exist", () => {
    expect(ingestionDetailsIndicateSignedAttestation("{}")).toBe(false);
    expect(
      ingestionDetailsIndicateSignedAttestation(
        JSON.stringify({ shadowCisoHandshake: { resolutionApprovalId: "pending-only" } }),
      ),
    ).toBe(false);
  });
});
