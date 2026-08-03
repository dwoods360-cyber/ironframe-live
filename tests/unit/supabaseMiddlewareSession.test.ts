import { describe, expect, it } from "vitest";

import { isInvalidRefreshTokenError } from "@/lib/supabase/middleware";

describe("isInvalidRefreshTokenError", () => {
  it("matches refresh_token_not_found code", () => {
    expect(
      isInvalidRefreshTokenError({
        code: "refresh_token_not_found",
        message: "Invalid Refresh Token: Refresh Token Not Found",
      }),
    ).toBe(true);
  });

  it("matches Invalid Refresh Token message", () => {
    expect(
      isInvalidRefreshTokenError({
        message: "Invalid Refresh Token: Refresh Token Not Found",
      }),
    ).toBe(true);
  });

  it("matches Refresh Token Not Found message", () => {
    expect(isInvalidRefreshTokenError({ message: "Refresh Token Not Found" })).toBe(true);
  });

  it("rejects unrelated auth errors", () => {
    expect(isInvalidRefreshTokenError({ code: "bad_jwt", message: "invalid claim" })).toBe(
      false,
    );
    expect(isInvalidRefreshTokenError(null)).toBe(false);
    expect(isInvalidRefreshTokenError("boom")).toBe(false);
  });
});
