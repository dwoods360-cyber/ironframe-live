import { describe, it, expect } from "vitest";
import {
  FORENSIC_FAULT_INJECTION_FLAG,
  TRANSACTION_ABORTED,
  sanitizedPayloadRequestsFaultInjection,
  throwForensicTransactionAborted,
} from "@/src/services/orchestration/forensicFaultInjection";

describe("forensic fault injection hooks", () => {
  it("detects force_downstream_crash flag", () => {
    expect(
      sanitizedPayloadRequestsFaultInjection({
        kwh: 1,
        [FORENSIC_FAULT_INJECTION_FLAG]: true,
      }),
    ).toBe(true);
    expect(sanitizedPayloadRequestsFaultInjection({ kwh: 1 })).toBe(false);
  });

  it("throws TRANSACTION_ABORTED message", () => {
    expect(() => throwForensicTransactionAborted("Irontrust")).toThrow(
      new RegExp(TRANSACTION_ABORTED, "i"),
    );
  });
});
