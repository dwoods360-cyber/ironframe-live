import { describe, expect, it } from "vitest";

import { decryptLastWillPayload, encryptLastWillPayload } from "@/lib/security/lwtCrypto";

describe("lwtCrypto", () => {
  it("round-trips encrypted payload", () => {
    process.env.LWT_ENCRYPTION_KEY = "test-lwt-key-min-16-chars";
    const plain = JSON.stringify({ test: true, n: 50 });
    const enc = encryptLastWillPayload(plain);
    expect(decryptLastWillPayload(enc)).toBe(plain);
  });
});
