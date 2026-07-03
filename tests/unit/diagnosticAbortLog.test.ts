import { describe, expect, it } from "vitest";
import { ABORT_REASONS } from "@/app/utils/abortReasons";
import {
  inferDiagnosticAbortReason,
  isCooperativeFetchAbort,
} from "@/app/utils/diagnosticAbortLog";

describe("diagnosticAbortLog", () => {
  it("detects cooperative AbortError messages", () => {
    const err = new DOMException("signal is aborted without reason", "AbortError");
    expect(isCooperativeFetchAbort(err)).toBe(true);
    expect(inferDiagnosticAbortReason(err)).toBe("signal is aborted without reason");
  });

  it("detects named abort reasons", () => {
    const err = new DOMException(ABORT_REASONS.activeThreatsBoardSuperseded, "AbortError");
    expect(isCooperativeFetchAbort(err)).toBe(true);
    expect(inferDiagnosticAbortReason(err)).toBe(ABORT_REASONS.activeThreatsBoardSuperseded);
  });

  it("ignores generic network failures", () => {
    expect(isCooperativeFetchAbort(new TypeError("Failed to fetch"))).toBe(false);
    expect(inferDiagnosticAbortReason(new TypeError("Failed to fetch"))).toBeNull();
  });
});
