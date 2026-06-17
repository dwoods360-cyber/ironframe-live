import { describe, expect, it } from "vitest";

import {
  generateWorkspaceInvitationToken,
  hashWorkspaceInvitationToken,
} from "@/app/utils/invitation-core";

describe("invitation-core", () => {
  it("hashes tokens deterministically with sha256 hex", () => {
    const token = "test-invite-token-abc";
    const a = hashWorkspaceInvitationToken(token);
    const b = hashWorkspaceInvitationToken(token);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("generates high-entropy base64url tokens", () => {
    const a = generateWorkspaceInvitationToken();
    const b = generateWorkspaceInvitationToken();
    expect(a.length).toBeGreaterThan(20);
    expect(a).not.toBe(b);
  });
});
