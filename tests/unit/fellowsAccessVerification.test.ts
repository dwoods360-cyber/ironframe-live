import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prismaFellows", () => ({
  default: { fellow: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() } },
}));
vi.mock("resend", () => ({ Resend: vi.fn() }));

import {
  FELLOW_ACCESS_TOKEN_TTL_MS,
  hashFellowAccessToken,
  mintFellowAccessToken,
} from "@/app/lib/fellows/accessVerification";

describe("Fellow access verification", () => {
  it("stores a stable SHA-256 digest rather than the raw access token", () => {
    const raw = "a".repeat(64);
    const digest = hashFellowAccessToken(raw);
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(digest).not.toBe(raw);
    expect(hashFellowAccessToken(raw)).toBe(digest);
  });

  it("mints a high-entropy token with a short expiry", () => {
    const now = new Date("2026-09-10T17:00:00.000Z");
    const minted = mintFellowAccessToken(now);
    expect(minted.rawToken).toMatch(/^[a-f0-9]{64}$/);
    expect(minted.tokenHash).toBe(hashFellowAccessToken(minted.rawToken));
    expect(minted.expiresAt.getTime()).toBe(now.getTime() + FELLOW_ACCESS_TOKEN_TTL_MS);
  });
});
