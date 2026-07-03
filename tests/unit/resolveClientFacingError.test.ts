import { describe, expect, it } from "vitest";
import {
  isBenignRuntimeEmissionError,
  resolveClientFacingError,
} from "@/app/utils/safeRuntimeEmission";

describe("resolveClientFacingError", () => {
  it("returns null for bare AbortError messages", () => {
    const err = new DOMException("signal is aborted without reason", "AbortError");
    expect(resolveClientFacingError(err, "Something failed")).toBeNull();
    expect(isBenignRuntimeEmissionError(err)).toBe(true);
  });

  it("returns null for named abort reasons", () => {
    const err = new DOMException("active-threats-board-superseded", "AbortError");
    expect(resolveClientFacingError(err, "Something failed")).toBeNull();
  });

  it("returns the error message for real failures", () => {
    const err = new Error("Tenant context required");
    expect(resolveClientFacingError(err, "Fallback")).toBe("Tenant context required");
  });

  it("returns fallback when error has no message", () => {
    expect(resolveClientFacingError({}, "Fallback")).toBe("Fallback");
  });
});
