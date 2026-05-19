import { afterEach, describe, expect, it } from "vitest";

import {
  matchExecutiveRoleFromKey,
  verifyExecutiveAdministrativeKey,
  verifyTripleExecutiveSubmission,
} from "@/app/lib/executiveAdministrativeKeyVerify";

const CEO = "a".repeat(32);
const CFO = "b".repeat(32);
const CIO = "c".repeat(32);

describe("executiveAdministrativeKeyVerify", () => {
  afterEach(() => {
    delete process.env.CEO_KEY_AUTH;
    delete process.env.CFO_KEY_AUTH;
    delete process.env.CIO_KEY_AUTH;
  });

  it("verifies configured executive keys", () => {
    process.env.CEO_KEY_AUTH = CEO;
    process.env.CFO_KEY_AUTH = CFO;
    process.env.CIO_KEY_AUTH = CIO;
    expect(verifyExecutiveAdministrativeKey("CEO", CEO)).toBe(true);
    expect(verifyTripleExecutiveSubmission({ ceoKey: CEO, cfoKey: CFO, cioKey: CIO }).ok).toBe(true);
  });

  it("rejects duplicate keys across roles", () => {
    process.env.CEO_KEY_AUTH = CEO;
    process.env.CFO_KEY_AUTH = CFO;
    process.env.CIO_KEY_AUTH = CIO;
    const r = verifyTripleExecutiveSubmission({ ceoKey: CEO, cfoKey: CEO, cioKey: CIO });
    expect(r.ok).toBe(false);
  });

  it("matches role for abort", () => {
    process.env.CFO_KEY_AUTH = CFO;
    expect(matchExecutiveRoleFromKey(CFO)).toBe("CFO");
    expect(matchExecutiveRoleFromKey("x".repeat(32))).toBeNull();
  });
});
